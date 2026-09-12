// 가상 기록만 사용합니다. 실행법: docs/review-2026-09-12.md
const artifactDir = process.env.ARTIFACT_DIR || require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'tinnitus-review-'));
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
 const page=await browser.newPage();page.setDefaultTimeout(5000);let failed=0;
 async function seed(){await page.goto((process.env.SITE || 'http://127.0.0.1:8765/'));await page.evaluate(()=>{state=DEFAULT_STATE();state.profile.startDate=dateKey();state.profile.unlockAll=true;save();});}
 async function route(r){await page.evaluate(r=>location.hash=r,r);await page.waitForTimeout(80);}
 async function test(name,fn){try{await seed();await fn();console.log('PASS',name)}catch(e){failed++;console.log('FAIL',name,e.message)}}
 await test('THI resubmission preserves all previous answers after leaving',async()=>{
  await page.evaluate(()=>{PROGRAM.modules.push({id:'week1_assessment',week:1,kind:'assess',title:'테스트 설문',screens:[{type:'questionnaire',title:'테스트 설문',questionnaire_type:'THI',timepoint_label:'baseline'}]});state.questionnaires=[{type:'THI',timepoint:'baseline',at:new Date().toISOString(),answers:Object.fromEntries(Array.from({length:25},(_,i)=>['q'+(i+1),2])),total:50,severity:'moderate'}];save()});
  await route('#/module/week1_assessment/0');await page.locator('input[name=q10][value="4"]').evaluate(el=>el.click());await route('#/');await route('#/module/week1_assessment/0');
  assert.equal(await page.locator('.q-opts input:checked').count(),25);
 });
 await test('Worksheet editing preserves unchanged fields after leaving',async()=>{
  await page.evaluate(()=>{state.worksheets.week2_worksheet={single:{},entries:[{at:'2026-09-01T00:00:00Z',responses:{situation:'원래 상황',automatic_thought:'원래 생각'}}]};save()});
  await route('#/module/week2_worksheet/0');await page.locator('[data-edit]').click();await page.locator('textarea[data-key=situation]').fill('수정 상황');await route('#/');await route('#/module/week2_worksheet/0');assert.equal(await page.locator('textarea[data-key=automatic_thought]').inputValue(),'원래 생각');
 });
 await test('Deleting final worksheet entry resets next button',async()=>{
  await page.evaluate(()=>{state.worksheets.week2_worksheet={single:{},entries:[{at:'2026-09-01T00:00:00Z',responses:{situation:'내용'}}]};save()});
  await route('#/module/week2_worksheet/0');page.once('dialog',d=>d.accept());await page.locator('[data-del]').click();assert.equal(await page.locator('#next-btn').getAttribute('data-mode'),'save');
 });
 await test('Storage failure does not report a successful diary save',async()=>{
  await route('#/today');for(const id of ['tinnitus','annoyance','sleep'])await page.locator(`[data-id=${id}][data-v="5"]`).click();
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}});
  await page.locator('[type=submit]').click();const message=await page.locator('#toast').innerText();await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);assert.match(message,/저장하지 못/);assert.equal(new URL(page.url()).hash,'#/today');
 });
 await test('Fractional module screen URL does not crash',async()=>{const errors=[];const handler=e=>errors.push(e.message);page.on('pageerror',handler);await route('#/module/week1_psychoeducation/0.5');page.off('pageerror',handler);assert.deepEqual(errors,[]);assert.ok(await page.locator('h1').count());});
 await test('QR retains THI answer order regardless of selection order',async()=>{const answer=await page.evaluate(()=>{const answers={q10:4,...Object.fromEntries(Array.from({length:25},(_,i)=>['q'+(i+1),i===9?4:2]))};state.questionnaires=[{answers}];return Transfer.compact(state).q[0][5]});assert.equal(answer,'2222222224222222222222222');});
 await browser.close();process.exitCode=failed?1:0;
})();
