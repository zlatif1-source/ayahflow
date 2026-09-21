(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.AyahFlowRecitationCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const ARABIC_LETTER_NAMES={الف:"ا",لام:"ل",ميم:"م",صاد:"ص",راء:"ر",كاف:"ك",هاء:"ه",ياء:"ي",عين:"ع",طاء:"ط",سين:"س",حاء:"ح",قاف:"ق",نون:"ن"};

  function normalizeArabic(text=""){
    return String(text).replace(/<[^>]*>/g," ").replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g,"").replace(/[\u0640\u200C\u200D\uFEFF]/g,"").replace(/[إأآٱ]/g,"ا").replace(/ءا/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ة/g,"ه").replace(/[^\u0621-\u063A\u0641-\u064A\s]/g," ").replace(/\s+/g," ").trim();
  }

  function stripLeadingBismillah(text="",surahNumber,ayahNumber){
    if(ayahNumber!==1||surahNumber===1||surahNumber===9)return text;
    const words=String(text).trim().split(/\s+/);
    return normalizeArabic(words.slice(0,4).join(" "))==="بسم الله الرحمن الرحيم"?words.slice(4).join(" "):text;
  }

  function tokenize(text=""){
    const tokens=normalizeArabic(text).split(" ").filter(Boolean);let letterCount=0;
    while(letterCount<tokens.length&&ARABIC_LETTER_NAMES[tokens[letterCount]])letterCount++;
    if(letterCount>=2)return[tokens.slice(0,letterCount).map(token=>ARABIC_LETTER_NAMES[token]).join(""),...tokens.slice(letterCount).filter(token=>token.length>1)];
    return tokens.filter(token=>token.length>1);
  }

  function tokenVariants(token=""){
    const variants=new Set([token]);
    if(token.length>3&&/[وفبكل]/.test(token[0]))variants.add(token.slice(1));
    if(token.length>5&&/[وف]/.test(token[0])&&/[بكل]/.test(token[1]))variants.add(token.slice(2));
    return [...variants].filter(Boolean);
  }

  function oneEditApart(a,b){
    if(Math.abs(a.length-b.length)>1)return false;
    if(a.length===b.length){let differences=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]&&++differences>1)return false;return true;}
    const shorter=a.length<b.length?a:b,longer=a.length<b.length?b:a;let i=0,j=0,skipped=false;
    while(i<shorter.length&&j<longer.length){if(shorter[i]===longer[j]){i++;j++;}else if(skipped)return false;else{skipped=true;j++;}}
    return true;
  }

  function tokensMatch(word,token){
    if(!word||!token)return false;
    if(word===token)return true;
    if(word.length>2&&token.length>2&&(word.includes(token)||token.includes(word)))return true;
    return Math.max(word.length,token.length)>=4&&oneEditApart(word,token);
  }

  function orderedWordProgress(queryTokens,verseTokens,startIndex=0){
    let cursor=Math.max(0,startIndex),matched=0,last=-1;
    for(const token of queryTokens){
      let index=verseTokens.findIndex((word,i)=>i>=cursor&&tokensMatch(word,token));
      if(index<0&&cursor>0)index=verseTokens.findIndex((word,i)=>i>=Math.max(0,cursor-2)&&i<cursor&&tokensMatch(word,token));
      if(index>=0){matched++;last=Math.max(last,index);cursor=Math.max(cursor,index+1);}
    }
    return{matched,last,ratio:matched/Math.max(queryTokens.length,1)};
  }

  function contiguousMatch(queryTokens,verseTokens){
    let best=0,bestLast=-1;
    for(let start=0;start<verseTokens.length;start++){
      let q=0,v=start,matched=0,gaps=0,last=-1;
      while(q<queryTokens.length&&v<verseTokens.length&&gaps<=1){
        if(tokensMatch(verseTokens[v],queryTokens[q])){matched++;last=v;q++;v++;}
        else{v++;gaps++;}
      }
      if(matched>best){best=matched;bestLast=last;}
    }
    return{matched:best,last:bestLast,ratio:best/Math.max(queryTokens.length,1)};
  }

  function scoreVerse(query,verse,context={}){
    const queryTokens=tokenize(query);if(!queryTokens.length)return{score:0,last:-1};
    const verseSet=new Set(verse.tokens),overlap=queryTokens.filter(token=>[...verseSet].some(word=>tokensMatch(word,token))).length,ordered=orderedWordProgress(queryTokens,verse.tokens),contiguous=contiguousMatch(queryTokens,verse.tokens),coverage=overlap/queryTokens.length,precision=overlap/Math.max(verse.tokens.length,1),normalized=normalizeArabic(query),phrase=(verse.normalized.includes(normalized)||normalized.includes(verse.normalized))?.2:0,near=(verse.surah===context.currentSurah&&Math.abs(verse.numberInSurah-context.currentAyah)<=2)?.07:0;
    return{score:Math.min(1,coverage*.34+precision*.08+ordered.ratio*.18+contiguous.ratio*.22+phrase+near),last:Math.max(ordered.last,contiguous.last),contiguous:contiguous.matched};
  }

  function matchEvidence(transcript,verse){
    const queryTokens=tokenize(transcript),ordered=orderedWordProgress(queryTokens,verse?.tokens||[]),contiguous=contiguousMatch(queryTokens,verse?.tokens||[]),minimum=(verse?.tokens.length||0)<=2?Math.max(1,verse?.tokens.length||1):3,normalized=normalizeArabic(transcript),exactPhrase=normalized.length>2&&Boolean(verse?.normalized.includes(normalized));
    return{queryTokens,ordered,contiguous,minimum,exactPhrase,enough:queryTokens.length>=minimum&&Math.max(ordered.matched,contiguous.matched)>=minimum};
  }

  function mergeRollingTranscript(existing="",incoming="",limit=24){
    const oldTokens=normalizeArabic(existing).split(" ").filter(Boolean),newTokens=normalizeArabic(incoming).split(" ").filter(Boolean);
    if(!newTokens.length)return oldTokens.slice(-limit).join(" ");
    if(!oldTokens.length)return newTokens.slice(-limit).join(" ");
    let overlap=0,max=Math.min(oldTokens.length,newTokens.length);
    for(let size=max;size>0;size--){let same=true;for(let i=0;i<size;i++)if(oldTokens[oldTokens.length-size+i]!==newTokens[i]){same=false;break;}if(same){overlap=size;break;}}
    if(overlap===0&&newTokens.length<=oldTokens.length){const tail=oldTokens.slice(-newTokens.length);if(tail.every((token,index)=>token===newTokens[index]))return oldTokens.slice(-limit).join(" ");}
    return [...oldTokens,...newTokens.slice(overlap)].slice(-limit).join(" ");
  }

  function chooseAlternative(alternatives,scorer){
    let best="",bestScore=-1;
    for(const alternative of alternatives||[]){const text=String(alternative?.transcript||alternative||"").trim();if(!text)continue;const score=Number(scorer(text))||0;if(score>bestScore){best=text;bestScore=score;}}
    return best||String(alternatives?.[0]?.transcript||alternatives?.[0]||"").trim();
  }

  return{normalizeArabic,stripLeadingBismillah,tokenize,tokenVariants,oneEditApart,tokensMatch,orderedWordProgress,contiguousMatch,scoreVerse,matchEvidence,mergeRollingTranscript,chooseAlternative};
});
