// 가상 기록만 사용합니다. 실행법: docs/review-2026-09-12.md
const artifactDir = process.env.ARTIFACT_DIR || require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'tinnitus-review-'));
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})}); const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}); const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SITE || 'http://127.0.0.1:8765/');
 await page.screenshot({path:artifactDir + '/home-after.png',fullPage:true});
 await page.locator('#start-btn').click();
 await page.evaluate(()=>{state.profile.unlockAll=true;save()});
 const modules=await page.evaluate(()=>PROGRAM.modules.map(m=>({id:m.id,screens:m.screens.length})));
 const issues=[];
 for(const route of ['/', '/program','/today','/sound','/records','/settings','/share',...modules.flatMap(m=>Array.from({length:m.screens},(_,i)=>`/module/${m.id}/${i}`))]){
  await page.evaluate(r=>location.hash='#'+r,route);await page.waitForTimeout(35);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  if(overflow)issues.push({route,overflow});
 }
 for(const route of ['/','/program','/today','/settings','/module/week2_worksheet/0']){
  await page.evaluate(r=>location.hash='#'+r,route);await page.waitForTimeout(100);
  const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  issues.push({route,axe:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});
 }
 for(const width of [320,390,768,1280]) {
  await page.setViewportSize({width,height:900});
  for(const scale of [1,1.3]) {
    await page.evaluate(scale=>{state.profile.fontScale=scale;applyFontScale()},scale);
    for(const route of ['/', '/program','/today','/settings','/module/week1_psychoeducation/0','/module/week2_worksheet/0','/share']) {
      await page.evaluate(r=>location.hash='#'+r,route);await page.waitForTimeout(50);
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))issues.push({width,scale,route,overflow:true});
    }
  }
}
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{state.profile.fontScale=1;applyFontScale();location.hash='#/program'});await page.waitForTimeout(100);await page.screenshot({path:artifactDir + '/program-after.png',fullPage:true});
console.log(JSON.stringify({modules:modules.length,screens:modules.reduce((n,m)=>n+m.screens,0),errors,issues},null,2));
 await browser.close();
 if (errors.length || issues.some(i => i.overflow || i.axe?.length)) process.exitCode = 1;
})().catch(e=>{console.error(e);process.exit(1)});
