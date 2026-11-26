# 厂区总览媒体与运营卡片改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `Commanding _screens/pages/指挥大屏.html` 中落地 P03 双视频、左图右视频任务区、四路图片全屏和五张运营卡的统一视觉，并用真实浏览器验收。

**Architecture:** 保持 2600×800 单文件原型与原生 JavaScript，不引入依赖。视频与监控图片复制到本屏资产目录；工作站和任务共用一套媒体切换函数，监控优先走原生 Fullscreen API，失败时复用现有图片弹窗；运营卡只调整展示层级，不改数据与详情入口。

**Tech Stack:** HTML5、CSS、原生 JavaScript、Node.js 结构检查、oil-ui `shoot.mjs` + 本机 Chrome。

**约束:** 当前目录不是 Git 仓库，不执行 commit/worktree。过程脚本与截图只放在 `.oil-ui/commanding-overview-media/`，正式页面不引用过程目录。

---

## 文件结构

- 修改：`Commanding _screens/pages/指挥大屏.html` — 媒体布局、监控全屏、工作站切换和运营卡样式。
- 新增：`Commanding _screens/assets/images/墙板拼装.mp4`、`s1.jpg`、`s2.jpg`、`s3.jpg` — 页面自包含资产。
- 新增过程文件：`.oil-ui/commanding-overview-media/check-structure.cjs` — 无依赖 DOM/资产静态验收。
- 已保存基线：`.oil-ui/commanding-overview-media/shots/baseline/page.png`。

### Task 1: 先建立失败验收并复制资产

**Files:**
- Create: `.oil-ui/commanding-overview-media/check-structure.cjs`
- Create: `Commanding _screens/assets/images/墙板拼装.mp4`
- Create: `Commanding _screens/assets/images/s1.jpg`
- Create: `Commanding _screens/assets/images/s2.jpg`
- Create: `Commanding _screens/assets/images/s3.jpg`

- [x] **Step 1: 写结构验收脚本**

```js
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = process.cwd();
const pagePath = path.join(root, 'Commanding _screens/pages/指挥大屏.html');
const html = fs.readFileSync(pagePath, 'utf8');
const asset = name => path.join(root, 'Commanding _screens/assets/images', name);

for (const name of ['墙板拼装.mp4', 's1.jpg', 's2.jpg', 's3.jpg']) {
  assert.ok(fs.statSync(asset(name)).size > 0, name + ' 应存在且非空');
}
assert.match(html, /<span id="wsName">P03 墙板拼装<\/span>/);
assert.match(html, /<h3 id="taskName">P03 墙板拼装<\/h3>/);
for (const id of ['wsVideo', 'taskVideo']) {
  const tag = html.match(new RegExp('<video[^>]*id="' + id + '"[^>]*>'))?.[0] || '';
  assert.ok(tag, id + ' 应存在');
  for (const attr of ['muted', 'autoplay', 'loop', 'playsinline']) {
    assert.ok(new RegExp('\\s' + attr + '(\\s|>|=)').test(tag), id + ' 缺少 ' + attr);
  }
  assert.ok(tag.includes('src="../assets/images/墙板拼装.mp4"'), id + ' 视频地址错误');
}
const sources = [...html.matchAll(/data-cam-src="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(sources, [
  '../assets/images/s1.jpg', '../assets/images/s2.jpg',
  '../assets/images/s3.jpg', '../assets/images/s1.jpg'
]);
assert.equal((html.match(/class="cam-full"/g) || []).length, 4);
assert.ok(html.includes('id="camStage"'));
assert.ok(html.includes('.cam-stage:fullscreen'));
assert.ok(html.includes('requestFullscreen'));
assert.ok(html.includes("openModal(title, src)"), '全屏失败必须回退到现有弹窗');
assert.ok(!html.includes('.oil-ui/'), '正式页面不得引用过程目录');
assert.ok(!html.includes('TODO'), '页面不得保留占位标记');
assert.ok(!/<(?:script|link)\b[^>]*(?:src|href)=["']https?:\/\//i.test(html), '不得新增外部依赖');
assert.ok(!html.includes('@keyframes'), '不得新增循环动画');
const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
const businessCss = style.replace(/:root\{[\s\S]*?\}/, '');
assert.equal(businessCss.match(/#[0-9a-fA-F]{3,8}\b/), null, '业务样式不得新增裸 hex');
console.log('结构验收通过：资产、双视频、四路监控、全屏回退与样式约束均符合规格。');
```

- [x] **Step 2: 运行并确认修改前失败**

Run: `node .oil-ui/commanding-overview-media/check-structure.cjs`
Expected: FAIL，首先报告 `墙板拼装.mp4 应存在且非空` 或对应 `ENOENT`。

- [x] **Step 3: 复制四个资产，保持源文件不变**

Run（PowerShell，工作目录为项目根）:

```powershell
$target = 'Commanding _screens/assets/images'
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -LiteralPath 'visit_screens/assets/images/墙板拼装.mp4' -Destination (Join-Path $target '墙板拼装.mp4')
Copy-Item -LiteralPath 'visit_screens/assets/images/s1.jpg' -Destination (Join-Path $target 's1.jpg')
Copy-Item -LiteralPath 'visit_screens/assets/images/s2.jpg' -Destination (Join-Path $target 's2.jpg')
Copy-Item -LiteralPath 'visit_screens/assets/images/s3.jpg' -Destination (Join-Path $target 's3.jpg')
Get-Item -LiteralPath (Join-Path $target '墙板拼装.mp4'),(Join-Path $target 's1.jpg'),(Join-Path $target 's2.jpg'),(Join-Path $target 's3.jpg') | Select-Object Name,Length
```

Expected: 四个文件均存在，字节数依次为 28857320、66464、103769、77711。

### Task 2: 改造工作站、当前任务和监控布局

**Files:**
- Modify: `Commanding _screens/pages/指挥大屏.html:72-114,224-263`

- [x] **Step 1: 替换左侧 CSS**

保留 `.p-head` 等公共样式，将 `.p1` 到 `.cam:hover span` 的局部样式替换为：

```css
[hidden]{display:none!important;}
.p1{flex:0 0 246px;}
.ws-sel{position:relative;margin:8px 12px;height:36px;flex:0 0 36px;display:flex;align-items:center;justify-content:center;font-size:18px;letter-spacing:1px;background:var(--gradient-panel);border:1px solid var(--border-soft);border-radius:4px;cursor:pointer;}
.ws-sel::after{content:"▾";margin-left:8px;color:var(--brand-cyan);}
.ws-menu{display:none;position:absolute;left:-1px;right:-1px;top:100%;z-index:9;background:var(--bg-elevated);border:1px solid var(--border-base);border-radius:4px;overflow:hidden;}
.ws-menu.open{display:block;}
.ws-menu div{padding:8px 12px;font-size:14px;border-bottom:1px solid var(--border-soft);}
.ws-menu div:hover{background:var(--bg-panel-hover);color:var(--brand-cyan);}
.ws-shot{flex:1;min-height:0;margin:0 12px;overflow:hidden;border:1px solid var(--border-soft);border-radius:2px;background:var(--bg-deep);}
.ws-shot img,.ws-shot video{width:100%;height:100%;object-fit:cover;display:block;}
.ws-foot{height:36px;flex:0 0 36px;margin-top:8px;font-size:18px;letter-spacing:1px;border:1px solid var(--border-soft);border-radius:4px;background:var(--gradient-panel);}
.ws-foot:hover{border-color:var(--brand-cyan);color:var(--brand-cyan);}
.p2{flex:0 0 262px;}
.task-row{display:grid;grid-template-columns:168px minmax(0,1fr);grid-template-rows:112px 40px;gap:8px 12px;padding:12px 12px 4px;flex:1;min-height:0;}
.task-thumb,.task-media{height:112px;overflow:hidden;border:1px solid var(--border-soft);border-radius:2px;background:var(--bg-deep);}
.task-thumb{width:168px;}
.task-media{min-width:0;}
.task-thumb img,.task-media img,.task-media video{width:100%;height:100%;object-fit:cover;display:block;}
.task-info{grid-column:1 / -1;min-width:0;display:grid;grid-template-columns:1.25fr 1fr 1fr;align-items:center;gap:8px;}
.task-info h3{font-size:18px;font-weight:600;color:var(--text-primary);white-space:nowrap;}
.task-info p{font-size:12px;color:var(--text-secondary);white-space:nowrap;}
.task-info p b{color:var(--brand-cyan);font-weight:600;}
.task-btns{height:40px;flex:0 0 40px;display:flex;gap:8px;padding:4px 12px 8px;}
.task-btns button{flex:1;border:1px solid var(--border-soft);border-radius:4px;font-size:16px;background:var(--gradient-panel);}
.task-btns button:hover{border-color:var(--brand-cyan);color:var(--brand-cyan);}
.p3{flex:1 1 auto;}
.cams{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:1;padding:8px 12px 12px;min-height:0;}
.cam{display:flex;flex-direction:column;min-width:0;border:1px solid var(--border-soft);border-radius:2px;overflow:hidden;background:var(--gradient-panel);}
.cam-view{border:0;background:none;padding:0;flex:1;min-height:0;display:block;width:100%;}
.cam img{width:100%;height:100%;object-fit:cover;display:block;}
.cam span{height:20px;flex:0 0 20px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-secondary);}
.cam-full{height:24px;flex:0 0 24px;border:0;border-top:1px solid var(--border-soft);font-size:12px;background:var(--gradient-panel);}
.cam-full:hover,.cam:hover span{color:var(--brand-cyan);}
.cam-stage{display:none;position:relative;background:var(--bg-deep);color:var(--text-primary);}
.cam-stage:fullscreen{display:flex;width:100vw;height:100vh;padding:64px 24px 24px;align-items:center;justify-content:center;}
.cam-stage:fullscreen img{display:block;max-width:100%;max-height:100%;object-fit:contain;}
.cam-stage-bar{position:absolute;left:24px;right:24px;top:16px;height:40px;display:flex;align-items:center;justify-content:space-between;font-size:18px;}
.cam-stage-bar button{height:32px;padding:0 16px;border:1px solid var(--border-base);border-radius:4px;font-size:14px;background:var(--bg-elevated);}
```

- [x] **Step 2: 替换工作站 HTML**

```html
<div class="panel p1">
  <div class="p-head"><i class="dia"></i>工作站</div>
  <div class="ws-sel" id="wsSel">
    <span id="wsName">P03 墙板拼装</span>
    <div class="ws-menu" id="wsMenu">
      <div data-st="P05 墙面腻子打磨" data-img="../assets/images/参观大屏-腻子打磨.png">P05 墙面腻子打磨</div>
      <div data-st="P03 墙板拼装" data-img="../assets/images/参观大屏-墙板拼装.png">P03 墙板拼装</div>
      <div data-st="P04 墙板焊接" data-img="../assets/images/参观大屏-墙板焊接.png">P04 墙板焊接</div>
    </div>
  </div>
  <div class="ws-shot">
    <video id="wsVideo" src="../assets/images/墙板拼装.mp4" poster="../assets/images/参观大屏-墙板拼装.png" muted autoplay loop playsinline preload="auto" aria-label="P03 墙板拼装工作站视频"></video>
    <img id="wsShot" src="../assets/images/参观大屏-墙板拼装.png" alt="工作站画面" hidden>
  </div>
  <button class="ws-foot" data-title="数字孪生 · 墙板拼装" data-img="../assets/images/参观大屏-墙板拼装.png" id="wsDigital">数字孪生</button>
</div>
```

- [x] **Step 3: 替换当前任务 HTML**

```html
<div class="panel p2">
  <div class="p-head"><i class="dia"></i>当前任务</div>
  <div class="task-row">
    <div class="task-thumb"><img src="../assets/images/生产产线-全局.png" alt="任务现场"></div>
    <div class="task-media">
      <video id="taskVideo" src="../assets/images/墙板拼装.mp4" poster="../assets/images/参观大屏-墙板拼装.png" muted autoplay loop playsinline preload="auto" aria-label="P03 墙板拼装任务视频"></video>
      <img id="taskShot" src="../assets/images/参观大屏-墙板拼装.png" alt="任务工位画面" hidden>
    </div>
    <div class="task-info">
      <h3 id="taskName">P03 墙板拼装</h3>
      <p>任务 MP20261019006</p>
      <p>产量 <b>36 / 110</b> · 进度 <b>33%</b></p>
    </div>
  </div>
  <div class="task-btns">
    <button data-title="任务详情" data-img="../assets/images/工位业务详情-任务.png">任务详情</button>
    <button data-title="设备详情" data-img="../assets/images/工位业务详情-设备.png">设备详情</button>
    <button data-title="设备定位" data-img="../assets/images/工位监控-全局详情.png">设备定位</button>
  </div>
</div>
```

- [x] **Step 4: 替换四路监控 HTML**

```html
<div class="panel p3">
  <div class="p-head"><i class="dia"></i>工位监控<span class="sub">CAM-01 ~ CAM-04</span></div>
  <div class="cams">
    <div class="cam" data-cam-title="CAM-01" data-cam-src="../assets/images/s1.jpg"><button class="cam-view" aria-label="全屏查看 CAM-01"><img src="../assets/images/s1.jpg" alt="CAM-01"></button><span>CAM-01</span><button class="cam-full" aria-label="全屏查看 CAM-01">全屏</button></div>
    <div class="cam" data-cam-title="CAM-02" data-cam-src="../assets/images/s2.jpg"><button class="cam-view" aria-label="全屏查看 CAM-02"><img src="../assets/images/s2.jpg" alt="CAM-02"></button><span>CAM-02</span><button class="cam-full" aria-label="全屏查看 CAM-02">全屏</button></div>
    <div class="cam" data-cam-title="CAM-03" data-cam-src="../assets/images/s3.jpg"><button class="cam-view" aria-label="全屏查看 CAM-03"><img src="../assets/images/s3.jpg" alt="CAM-03"></button><span>CAM-03</span><button class="cam-full" aria-label="全屏查看 CAM-03">全屏</button></div>
    <div class="cam" data-cam-title="CAM-04" data-cam-src="../assets/images/s1.jpg"><button class="cam-view" aria-label="全屏查看 CAM-04"><img src="../assets/images/s1.jpg" alt="CAM-04"></button><span>CAM-04</span><button class="cam-full" aria-label="全屏查看 CAM-04">全屏</button></div>
  </div>
</div>
```

### Task 3: 接入媒体切换与四路全屏

**Files:**
- Modify: `Commanding _screens/pages/指挥大屏.html:371-439`

- [x] **Step 1: 在通用弹窗后增加全屏舞台**

```html
<div class="cam-stage" id="camStage">
  <div class="cam-stage-bar"><span id="camStageTitle"></span><button id="camStageExit">退出全屏</button></div>
  <img id="camStageImg" alt="监控全屏画面">
</div>
```

- [x] **Step 2: 替换工作站切换逻辑，并追加监控全屏逻辑**

```js
const mediaPairs = [[$('#wsVideo'), $('#wsShot')], [$('#taskVideo'), $('#taskShot')]];
function syncStationMedia(name, image) {
  const assembly = name === 'P03 墙板拼装';
  mediaPairs.forEach(([video, still]) => {
    still.src = image;
    const useVideo = assembly && video.dataset.failed !== 'true';
    video.hidden = !useVideo;
    still.hidden = useVideo;
    if (useVideo) {
      video.play().catch(() => { video.hidden = true; still.hidden = false; });
    } else video.pause();
  });
}
mediaPairs.forEach(([video, still]) => {
  video.addEventListener('error', () => {
    video.dataset.failed = 'true';
    video.hidden = true;
    still.hidden = false;
  });
});

$('#wsSel').addEventListener('click', () => $('#wsMenu').classList.toggle('open'));
$$('#wsMenu div').forEach(item => {
  item.addEventListener('click', event => {
    event.stopPropagation();
    const name = item.dataset.st;
    $('#wsName').textContent = name;
    $('#taskName').textContent = name;
    syncStationMedia(name, item.dataset.img);
    $('#wsDigital').dataset.img = item.dataset.img;
    $('#wsDigital').dataset.title = '数字孪生 · ' + name;
    $('#wsMenu').classList.remove('open');
    toast('已切换至 ' + name);
  });
});

const camStage = $('#camStage');
function openCam(cam) {
  const title = cam.dataset.camTitle;
  const src = cam.dataset.camSrc;
  $('#camStageTitle').textContent = title;
  $('#camStageImg').src = src;
  $('#camStageImg').alt = title + ' 全屏画面';
  if (!camStage.requestFullscreen) { openModal(title, src); return; }
  camStage.style.display = 'flex';
  camStage.requestFullscreen().catch(() => {
    camStage.style.display = 'none';
    openModal(title, src);
  });
}
$$('.cam').forEach(cam => {
  cam.querySelector('.cam-view').addEventListener('click', () => openCam(cam));
  cam.querySelector('.cam-full').addEventListener('click', () => openCam(cam));
});
function closeCam() {
  if (document.fullscreenElement === camStage) {
    document.exitFullscreen().catch(() => { camStage.style.display = 'none'; });
  } else camStage.style.display = 'none';
}
$('#camStageExit').addEventListener('click', closeCam);
addEventListener('keydown', event => {
  if (event.key === 'Escape' && camStage.style.display !== 'none') closeCam();
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) camStage.style.display = 'none';
});
```

- [x] **Step 3: 运行结构验收**

Run: `node .oil-ui/commanding-overview-media/check-structure.cjs`
Expected: PASS，输出 `结构验收通过：资产、双视频、四路监控、全屏回退与样式约束均符合规格。`

### Task 4: 统一五个运营卡视觉层级

**Files:**
- Modify: `Commanding _screens/pages/指挥大屏.html:9-22,160-191,300-366`

- [x] **Step 1: 在 `:root` 增加派生 token**

```css
--bg-card-header:rgba(9,38,64,.20);
--bg-card-kpi:transparent;
--bg-card-section:rgba(9,38,64,.20);
--border-card-inner:rgba(150,205,220,.12);
--border-card-highlight:rgba(111,220,234,.36);
--gradient-card:linear-gradient(180deg,rgba(18,62,92,.42),rgba(12,50,76,.24));
```

- [x] **Step 2: 用以下样式替换运营卡 CSS，保留原有 SVG 和数据**

```css
.cards{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr 190px;gap:16px;}
.card{overflow:hidden;background:var(--gradient-card);transition:border-color 150ms ease;}
.card:hover{border-color:var(--border-card-highlight);}
.card .p-head{position:relative;background:var(--bg-card-header);}
.card .p-head::after{content:"";position:absolute;left:0;top:0;width:64px;height:2px;background:var(--brand-cyan);}
.card .p-head .dia{filter:none;}
.card-body{flex:1;min-height:0;padding:8px 12px;display:flex;flex-direction:column;justify-content:space-between;gap:4px;}
.kpi-block{padding:4px 8px;border-left:2px solid var(--brand-cyan);border-radius:2px;background:var(--bg-card-kpi);}
.chart-block{padding:4px 8px;border:1px solid var(--border-card-inner);border-radius:2px;background:var(--bg-card-section);}
.chart-block>.lbl{margin-bottom:0;}
.big{font-size:28px;line-height:1.15;font-weight:700;color:var(--brand-cyan);letter-spacing:.5px;margin-bottom:4px;}
.big small{font-size:14px;color:var(--text-secondary);margin-left:4px;font-weight:400;}
.lbl{font-size:14px;line-height:1.5;letter-spacing:.5px;color:var(--text-secondary);}
.mini{font-size:14px;line-height:1.5;letter-spacing:.5px;color:var(--text-secondary);}
.mini em{font-style:normal;color:var(--state-warn);}
.card-note{padding-top:4px;border-top:1px solid var(--border-soft);}
.bars{display:flex;gap:4px;height:16px;align-items:center;}
.bars i{width:auto;max-width:12px;height:12px;flex:1;border-radius:2px;background:var(--chart-track);}
.bars i.on{background:linear-gradient(90deg,var(--brand-blue),var(--brand-cyan));}
.meter{height:8px;border-radius:2px;background:var(--chart-track);overflow:hidden;}
.meter i{display:block;height:100%;border-radius:2px;background:linear-gradient(90deg,var(--brand-blue),var(--brand-cyan));}
.gauge-row{display:flex;align-items:center;gap:12px;}
.gauge-row svg{width:100px;height:60px;flex:0 0 100px;}
.gauge-row .big{margin-bottom:0;}
.gauge-row .mini{font-size:12px;white-space:nowrap;}
.device-card .gauge-row svg text{font-size:20px;opacity:.72;}
.device-card .gauge-row .lbl{font-size:12px;color:var(--text-tertiary);}
.device-card .gauge-row .big{font-size:20px;}
.device-card .gauge-row .mini{font-size:12px;color:var(--text-tertiary);}
.trend-block svg{display:block;width:100%;height:44px;}
.low{display:flex;gap:16px;flex:1;min-width:0;}
.low>div{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:8px;}
.low .sep{border-left:1px solid var(--border-soft);padding-left:16px;}
.low svg{width:100%;height:44px;}
.wide{grid-column:1 / -1;}
.rbtn{flex:0 0 44px;font-size:18px;letter-spacing:2px;border:1px solid var(--border-soft);border-radius:4px;background:var(--gradient-panel);}
.rbtn:hover{border-color:var(--brand-cyan);color:var(--brand-cyan);}
```

- [x] **Step 3: 用以下完整标记替换 `<div class="cards">` 到其闭合标签，只增加语义 class，不改数值**

```html
<div class="cards">
  <div class="panel card">
    <div class="p-head"><i class="dia"></i>综合生产<button class="sub" data-title="综合生产详情" data-img="../assets/images/综合生产-详情.png">详情</button></div>
    <div class="card-body">
      <div class="kpi-block"><div class="big">32 / 38</div><div class="lbl">实际 / 计划产量 · 件</div></div>
      <div class="chart-block"><div class="lbl">计划完成进度</div><div class="bars" id="prodBars"></div></div>
      <div class="mini card-note">达成 <em>84.2%</em> · 距计划 6 件</div>
    </div>
  </div>
  <div class="panel card">
    <div class="p-head"><i class="dia"></i>设备运行<button class="sub" data-title="设备运行详情" data-img="../assets/images/设备运行-详情.png">详情</button></div>
    <div class="card-body device-card">
      <div class="kpi-block"><div class="big">98%</div><div class="lbl">设备在线率</div></div>
      <div class="gauge-row chart-block">
        <svg viewBox="0 0 128 74">
          <path d="M14 64 A50 50 0 0 1 114 64" fill="none" style="stroke:var(--chart-track)" stroke-width="10" stroke-linecap="round"/>
          <path d="M14 64 A50 50 0 0 1 114 64" fill="none" style="stroke:var(--brand-cyan)" stroke-width="10" stroke-linecap="round" stroke-dasharray="154 157"/>
          <text x="64" y="58" style="fill:var(--brand-cyan)" font-size="24" text-anchor="middle">98%</text>
        </svg>
        <div><div class="lbl">故障停机</div><div class="big" style="font-size:20px;color:var(--state-warn)">42 min</div><div class="mini">平均修复 21 min/次</div></div>
      </div>
    </div>
  </div>
  <div class="panel card">
    <div class="p-head"><i class="dia"></i>质量管控<button class="sub" data-title="质量管控详情" data-img="../assets/images/质量管控-详情.png">详情</button></div>
    <div class="card-body">
      <div class="kpi-block"><div class="big">97.5%</div><div class="lbl">一次检验合格率</div></div>
      <div class="chart-block"><div class="lbl">首检合格占比</div><div class="meter"><i style="width:97.5%"></i></div></div>
      <div class="mini card-note">待复检 6 件 · <em>返修率 2.5%</em></div>
    </div>
  </div>
  <div class="panel card">
    <div class="p-head"><i class="dia"></i>物流调度<button class="sub" data-title="物流调度详情" data-img="../assets/images/物流调度-详情.png">详情</button></div>
    <div class="card-body">
      <div class="kpi-block"><div class="big">96%</div><div class="lbl">配送准时率</div></div>
      <div class="chart-block trend-block"><svg viewBox="0 0 260 46" preserveAspectRatio="none"><polyline points="0,20 22,22 44,19 66,24 88,21 110,26 132,22 154,25 176,20 198,23 220,18 242,21 260,19" fill="none" style="stroke:var(--brand-cyan)" stroke-width="2"/></svg></div>
      <div class="mini card-note">7日准时率 · <em>逾期 4 单</em></div>
    </div>
  </div>
  <div class="panel card wide">
    <div class="p-head"><i class="dia"></i>低碳安全<button class="sub" data-title="低碳安全详情" data-img="../assets/images/低碳安全-详情.png">详情</button></div>
    <div class="card-body">
      <div class="low">
        <div>
          <div class="kpi-block"><div class="big">1360 kWh</div><div class="lbl">生产用电量 · 当日</div></div>
          <div class="chart-block"><svg viewBox="0 0 260 48" preserveAspectRatio="none">
            <polyline points="0,32 20,28 40,30 60,25 80,27 100,22 120,24 140,20 160,23 180,19 200,21 220,17 240,19 260,16" fill="none" style="stroke:var(--brand-cyan)" stroke-width="2"/>
            <polyline points="0,32 20,28 40,30 60,25 80,27 100,22 120,24 140,20 160,23 180,19 200,21 220,17 240,19 260,16 260,48 0,48" style="fill:var(--chart-fill)" stroke="none"/>
          </svg></div>
        </div>
        <div class="sep">
          <div class="kpi-block"><div class="lbl">单位合格品电耗</div><div class="big" style="font-size:24px">42.5 kWh/件</div></div>
          <div class="mini card-note">安防事件 <em>8 条</em> · 未确认 <em>2 条</em></div>
        </div>
      </div>
    </div>
  </div>
</div>
```

Expected: `32 / 38`、`98%`、`42 min`、`97.5%`、`96%`、`1360 kWh`、`42.5 kWh/件` 和五个 `详情` 按钮保持原样。

### Task 5: 真实浏览器与规范验收

**Files:**
- Create: `.oil-ui/commanding-overview-media/shots/final/*`
- Create: `.oil-ui/commanding-overview-media/shots/interactions/*`
- Review: `Commanding _screens/pages/指挥大屏.html`

- [x] **Step 1: 重跑结构验收与禁止项扫描**

Run: `node .oil-ui/commanding-overview-media/check-structure.cjs`
Expected: PASS，输出 `结构验收通过：资产、双视频、四路监控、全屏回退与样式约束均符合规格。`；脚本同时保证裸 hex 仅位于 `:root` token，且无占位符、过程目录引用、新依赖或新增循环动画。

- [x] **Step 2: 截 1920×590 的 100% 与 200% 实图**

Run:

```powershell
& 'C:/Users/10208/.qcdl/dsh-runtimes/dsh-next-primary-runtime/dependencies/node/bin/node.exe' 'C:/Users/10208/.agents/skills/oil-ui/scripts/shoot.mjs' 'Commanding _screens/pages/指挥大屏.html' --root '.' --size 1920x590 --zoom 1,2 --out '.oil-ui/commanding-overview-media/shots/final' --wait 1500 --timeout-scale 2
```

Expected: 生成 `page.png`、`page@2x.png` 和 `report.json`；两处视频有画面，任务文字完整，监控为 s1/s2/s3/s1，五卡无重叠、溢出或乱码。若工具报图片未加载，先核对 report 与实际截图，不以截图成功代替资源验收。

- [x] **Step 3: 验证工作站切换和四路全屏**

Run:

```powershell
& 'C:/Users/10208/.qcdl/dsh-runtimes/dsh-next-primary-runtime/dependencies/node/bin/node.exe' 'C:/Users/10208/.agents/skills/oil-ui/scripts/shoot.mjs' 'Commanding _screens/pages/指挥大屏.html' --root '.' --size 1920x590 --out '.oil-ui/commanding-overview-media/shots/interactions' --wait 800 --timeout-scale 2 --steps "切换P05: click #wsSel; click #wsMenu div[data-st='P05 墙面腻子打磨']; wait 400" --steps "CAM01: click .cam:nth-child(1) .cam-full; wait 300" --steps "CAM02: click .cam:nth-child(2) .cam-full; wait 300" --steps "CAM03: click .cam:nth-child(3) .cam-full; wait 300" --steps "CAM04: click .cam:nth-child(4) .cam-full; wait 300" --steps "图片点击并退出: click .cam:nth-child(1) .cam-view; wait 200; key Escape; wait 400" --steps "按钮退出: click .cam:nth-child(2) .cam-full; wait 300; click #camStageExit; wait 400"
```

Expected: 切换 P05 后两处均显示腻子打磨静态图且菜单关闭；四个 CAM 截图均为对应完整图片；图片点击可进入全屏，Escape 后回到总览。若浏览器不支持原生全屏，应看到对应图片的现有弹窗，关闭按钮、遮罩和 Escape 可退出。

- [x] **Step 4: 检查视频连续播放**

Run:

```powershell
& 'C:/Users/10208/.qcdl/dsh-runtimes/dsh-next-primary-runtime/dependencies/node/bin/node.exe' 'C:/Users/10208/.agents/skills/oil-ui/scripts/shoot.mjs' 'Commanding _screens/pages/指挥大屏.html' --root '.' --size 1920x590 --out '.oil-ui/commanding-overview-media/shots/video' --wait 800 --frames 6 --steps "视频播放: wait 1800" --timeout-scale 2
```

Expected: 序列帧中两处墙板拼装视频持续推进；若视频解码失败，页面显示墙板拼装封面且结构检查仍通过，并在结果中明确说明。

- [x] **Step 5: 最终人工对照**

逐条核对设计 `docs/superpowers/specs/2026-11-19-commanding-overview-media-design.md` 第 5 节六项验收；确认任务三按钮、数字孪生、五个详情和整厂运营分析仍由原通用弹窗处理，中央模型、时钟、漫游、全屏放大与视角保存代码未改。最终回复附最终 100% 截图，并列出结构检查、交互检查及任何未通过项。
