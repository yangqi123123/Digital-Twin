
(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const pad = n => String(n).padStart(2,'0');

  /* 时钟 */
  function tick(){
    const d = new Date();
    $('#clock').textContent = pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
    $('#date').textContent = d.getFullYear()+'/'+pad(d.getMonth()+1)+'/'+pad(d.getDate());
  }
  setInterval(tick,1000); tick();

  /* 2600 × 800 设计稿等比适配窗口 */
  function fit(){
    document.documentElement.style.setProperty('--s',
      Math.min(innerWidth/2600, innerHeight/800));
  }
  addEventListener('resize',fit); fit();

  /* 提示 */
  let toastTimer;
  function toast(msg){
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('show'),2200);
  }

  /* 图表 hover 小标签：把 data-tip 文本按「标题 / 指标行」纵向排版 */
  const escTip = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  function formatTip(raw){
    let txt = String(raw==null?'':raw).trim();
    let title = '', body = txt;
    const cm = txt.match(/^([^：:]+)[：:]\s*(.*)$/);
    if(cm){ title = cm[1].trim(); body = cm[2].trim(); }
    // 主体按 / 或 · 拆成多条指标
    let parts = body.indexOf('/')>-1 ? body.split(/\s*\/\s*/)
              : body.indexOf('·')>-1 ? body.split(/\s*·\s*/) : [body];
    // 单条指标：尝试拆成「标签 / 数值」，否则整段作为值
    const rows = parts.map(p=>{
      p = p.trim(); if(!p) return '';
      const pm = p.match(/^([^：:\d]+?)[：:]\s*(.*)$/);   // 标签：数值
      if(pm) return `<div class="ct-row"><span class="ct-k">${escTip(pm[1].trim())}：</span><span class="ct-v">${escTip(pm[2].trim())}</span></div>`;
      const sm = p.match(/^(\D+?)\s+([\d].*)$/);           // 标签 数值（数值以数字开头）
      if(sm) return `<div class="ct-row"><span class="ct-k">${escTip(sm[1].trim())}：</span><span class="ct-v">${escTip(sm[2].trim())}</span></div>`;
      return `<div class="ct-row"><span class="ct-v">${escTip(p)}</span></div>`;
    }).filter(Boolean).join('');
    const head = title ? `<div class="ct-title">${escTip(title)}${rows?'：':''}</div>` : '';
    return head + rows;
  }
  const chartTip = $('#chartTip');
  document.addEventListener('pointermove', e => {
    const target = e.target.closest && e.target.closest('[data-tip]');
    if(!target){ chartTip.style.display='none'; return; }
    chartTip.innerHTML = formatTip(target.getAttribute('data-tip'));
    chartTip.style.display = 'block';
    const x = Math.min(e.clientX + 14, innerWidth - chartTip.offsetWidth - 8);
    const y = Math.max(8, e.clientY - chartTip.offsetHeight - 12);
    chartTip.style.left = x + 'px';
    chartTip.style.top = y + 'px';
  }, true);
  document.addEventListener('pointerdown', () => { chartTip.style.display='none'; }, true);

  /* 通用详情弹窗 */
  const modal = $('#modal');
  function openModal(title,src){
    if(!src) return;
    $('#modalTitle').textContent = title;
    $('#modalImg').src = src;
    modal.style.display = 'flex';
  }
  function closeModal(){ modal.style.display='none'; }
  $('#modalClose').addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
  addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

  $$('[data-title][data-img]').forEach(btn=>{
    btn.addEventListener('click',()=>openModal(btn.dataset.title,btn.dataset.img));
  });

  /* 工作站切换 */
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

  /* 顶部视角切换：其余界面按独立 HTML 文件后续制作 */
  $$('.tab[data-soon]').forEach(tab=>{
    tab.addEventListener('click',()=>toast('「'+tab.dataset.soon+'」界面待下发指令后独立制作'));
  });

  /* 漫游菜单 */
  const roamMenu = $('#roamMenu');
  $('#roamBtn').addEventListener('click',()=>roamMenu.classList.toggle('open'));
  let roamTimer = null;
  function setRoam(on){
    if(roamTimer){ clearInterval(roamTimer); roamTimer=null; }
    if(on){
      roamTimer = setInterval(()=>{
        view.x -= 3;
        if(view.x < -140) view.x = 0;
        applyView();
      },80);
      toast('自动漫游已开启');
    }else{
      toast('自动漫游已停止');
    }
    roamMenu.classList.remove('open');
  }
  $('#roamStart').addEventListener('click',()=>setRoam(true));
  $('#roamStop').addEventListener('click',()=>setRoam(false));

  $('#fullBtn').addEventListener('click',()=>{
    const el = $('#screen');
    if(document.fullscreenElement){ document.exitFullscreen(); return; }
    if(el.requestFullscreen){ el.requestFullscreen().catch(()=>toast('当前环境不支持全屏')); }
    else toast('当前环境不支持全屏');
  });

  /* 模型：左键旋转 / 中键平移 / 滚轮缩放 / 视角保存 */
  const view = Object.assign({x:0,y:0,s:1,r:0}, (()=>{
    try{ return JSON.parse(localStorage.getItem('cmdOverviewView'))||{}; }catch(e){ return {}; }
  })());
  const img = $('#modelImg'), box = $('#model');
  function applyView(){
    img.style.transform = 'translate('+view.x+'px,'+view.y+'px) rotate('+view.r+'deg) scale('+view.s+')';
  }
  applyView();
  let drag = null;
  box.addEventListener('pointerdown',e=>{
    if(e.button!==0 && e.button!==1) return;
    e.preventDefault();
    drag = {mode:e.button===1?'pan':'rotate',x:e.clientX,y:e.clientY};
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove',e=>{
    if(!drag) return;
    const dx = e.clientX-drag.x, dy = e.clientY-drag.y;
    if(drag.mode==='pan'){ view.x += dx; view.y += dy; }
    else view.r = Math.max(-25,Math.min(25,view.r+dx*.08));
    drag.x = e.clientX; drag.y = e.clientY; applyView();
  });
  const endDrag = ()=>{ drag=null; };
  box.addEventListener('pointerup',endDrag);
  box.addEventListener('pointercancel',endDrag);
  box.addEventListener('wheel',e=>{
    e.preventDefault();
    view.s = Math.max(1,Math.min(2.5,view.s+(e.deltaY<0?.12:-.12)));
    applyView();
  },{passive:false});
  $('#resetView').addEventListener('click',()=>{
    if(roamTimer) setRoam(false);
    Object.assign(view,{x:0,y:0,s:1,r:0}); applyView(); toast('视角已归位');
  });
  $('#saveView').addEventListener('click',()=>{
    localStorage.setItem('cmdOverviewView',JSON.stringify(view));
    toast('默认视角已保存');
  });

  /* ===================================================================
     右侧指标区：运营分析（8 模块） / 工厂概况 双视图
     =================================================================== */
  const CY = '#6FDCEA', BL = '#3E86B4', GR = '#4FD69B', OR = '#F0B75A', RD = '#FF5D6C';
  let gid = 0; const uid = () => 'g'+(++gid);
  const tipLbl = i => MONTHS[i] || ('第'+(i+1)+'期');
  const tipEsc = s => String(s).replace(/"/g,'&quot;');

  /* ---- SVG 图表生成器 ---- */
  function areaLine(data, color, {h=60,w=220,fill=true,dot=true}={}){
    const min=Math.min(...data), max=Math.max(...data), span=(max-min)||1;
    const pts=data.map((v,i)=>[4+i*(w-8)/(data.length-1), h-7-((v-min)/span)*(h-18)]);
    const line=pts.map(p=>p.join(',')).join(' ');
    const len=Math.round(Math.hypot(w,h)*1.8);
    const grad=uid();
    const area=`M${pts[0][0]},${h} `+pts.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')+` L${pts[pts.length-1][0]},${h} Z`;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="${grad}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity=".34"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${fill?`<path d="${area}" fill="url(#${grad})" class="fade-up"/>`:''}
      <polyline class="line-anim" points="${line}" fill="none" stroke="${color}" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" style="--len:${len}"/>
      ${dot?`<circle cx="${pts[pts.length-1][0]}" cy="${pts[pts.length-1][1]}" r="3" fill="${color}" class="fade-up"/>`:''}
      ${data.map((v,i)=>`<circle cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="7" fill="transparent" pointer-events="all" data-tip="${tipEsc(tipLbl(i)+'：'+v)}"/>`).join('')}
    </svg>`;
  }
  function multiLine(series, colors, {h=60,w=220}={}){
    let out='';
    series.forEach((data,si)=>{
      const all=series.flat(), min=Math.min(...all), max=Math.max(...all), span=(max-min)||1;
      const pts=data.map((v,i)=>[4+i*(w-8)/(data.length-1), h-7-((v-min)/span)*(h-18)]);
      const len=Math.round(Math.hypot(w,h)*1.8);
      out+=`<polyline class="line-anim" points="${pts.map(p=>p.join(',')).join(' ')}" fill="none"
        stroke="${colors[si]}" stroke-width="2" stroke-linecap="round" style="--len:${len}"/>`;
      out+=`<circle cx="${pts[pts.length-1][0]}" cy="${pts[pts.length-1][1]}" r="2.6" fill="${colors[si]}" class="fade-up"/>`;
      data.forEach((v,j)=>{ out+=`<circle cx="${pts[j][0].toFixed(1)}" cy="${pts[j][1].toFixed(1)}" r="7" fill="transparent" pointer-events="all" data-tip="系列${si+1} · ${tipEsc(tipLbl(j)+'：'+v)}"/>`; });
    });
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${out}</svg>`;
  }
  function barsChart(data, colors, {h=60,w=220}={}){
    const max=Math.max(...data)||1, n=data.length, slot=(w-8)/n, bw=Math.min(slot*.5,26);
    let bars='';
    data.forEach((v,i)=>{
      const c=colors[i%colors.length], bh=Math.max(3,(v/max)*(h-16));
      const x=4+slot*i+(slot-bw)/2, y=h-6-bh;
      bars+=`<rect class="bar-anim" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}"
        height="${bh.toFixed(1)}" rx="1.5" fill="${c}" style="animation-delay:${i*70}ms"
        data-tip="${tipEsc(tipLbl(i)+'：'+v)}"/>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${bars}</svg>`;
  }
  function gridLines(h,w,n=4,base=24){
    let s=''; for(let i=1;i<=n;i++){ const y=h-base-(h-base-16)*i/n;
      s+=`<line class="grid-ln" x1="30" y1="${y.toFixed(1)}" x2="${w-8}" y2="${y.toFixed(1)}"/>`; }
    return s;
  }
  function groupedBars(groups, colors, {h=210,w=560,labels=[],unit=''}={}){
    const flat=groups.flat(), max=Math.max(...flat)||1, gw=(w-50)/groups.length;
    let s=gridLines(h,w);
    groups.forEach((g,gi)=>{
      const bw=Math.min(gw*.26,30);
      g.forEach((v,si)=>{
        const bh=(v/max)*(h-52), x=30+gi*gw+gw/2-bw+si*(bw+4), y=h-28-bh;
        s+=`<rect class="bar-anim" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}"
          rx="2" fill="${colors[si]}" style="animation-delay:${gi*110+si*60}ms"
          data-tip="${tipEsc((labels[gi]||('第'+(gi+1)+'组'))+'：'+v)}"/>`;
        s+=`<text x="${(x+bw/2).toFixed(1)}" y="${(y-6).toFixed(1)}" fill="${colors[si]}" font-size="12"
          text-anchor="middle">${v}</text>`;
      });
      if(labels[gi]) s+=`<text x="${(30+gi*gw+gw/2).toFixed(1)}" y="${h-9}" class="ax-lbl" text-anchor="middle">${labels[gi]}</text>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${s}</svg>`;
  }
  function donut(pct, color, center, sub, size=110){
    const R=42, circ=2*Math.PI*R, off=circ*(1-Math.min(100,Math.max(0,pct))/100);
    return `<svg viewBox="0 0 110 110" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet">
      <circle cx="55" cy="55" r="${R}" fill="none" stroke="rgba(150,205,220,.18)" stroke-width="9"/>
      <circle class="donut-anim" cx="55" cy="55" r="${R}" fill="none" stroke="${color}" stroke-width="9"
        stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 55 55)" style="--len:${circ.toFixed(1)};--off:${off.toFixed(1)}"
        data-tip="${tipEsc((sub||'占比')+'：'+(center!=null?center:pct+'%'))}"/>
      <text x="55" y="${sub?52:60}" fill="${color}" font-size="22" font-weight="700" text-anchor="middle">${center!=null?center:pct+'%'}</text>
      ${sub?`<text x="55" y="70" fill="#7FA8BF" font-size="10" text-anchor="middle">${sub}</text>`:''}
    </svg>`;
  }
  function meters(rows){
    return `<div class="mini-meters">${rows.map(r=>
      `<div class="mrow"><span class="mhead"><span class="mn">${r.l}</span><span class="mv">${r.v}%</span></span>
        <span class="mt"><i data-w="${r.v}"></i></span></div>`).join('')}</div>`;
  }
  function donutLegend(pct,color,label,sub){
    return `<div class="donut-wrap">${donut(pct,color,pct+'%')}
      <div class="donut-legend"><div><i style="background:${color}"></i>${label}</div>
      <div style="color:var(--text-primary)">${sub}</div></div></div>`;
  }

  /* ---- 聚焦型卡片专用图表 ---- */
  /* 工厂产能：大环 + 中心主数值（带底座光环） */
  function heroRing(pct,color,num,unit,label){
    const R=52,cx=64,cy=60,circ=2*Math.PI*R,off=circ*(1-Math.min(100,pct)/100);
    return `<svg viewBox="0 0 128 124" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="hr${gid}" cx="50%" cy="50%" r="50%">
        <stop offset="55%" stop-color="rgba(111,220,234,0)"/>
        <stop offset="100%" stop-color="${color}" stop-opacity=".14"/></radialGradient></defs>
      <ellipse cx="${cx}" cy="${cy+52}" rx="46" ry="9" fill="${color}" opacity=".12"/>
      <ellipse cx="${cx}" cy="${cy+44}" rx="38" ry="7" fill="none" stroke="${color}" stroke-opacity=".22"/>
      <ellipse cx="${cx}" cy="${cy+38}" rx="30" ry="5" fill="none" stroke="${color}" stroke-opacity=".16"/>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#hr${gid})"/>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(150,205,220,.16)" stroke-width="10"/>
      <circle class="donut-anim" cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${color}" stroke-width="10"
        stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 ${cx} ${cy})"
        data-tip="${tipEsc(label+'：'+num+' '+unit+' · '+pct+'%')}"/>
      <text x="${cx}" y="${cy-2}" fill="${color}" font-size="24" font-weight="700" text-anchor="middle">${num}</text>
      <text x="${cx}" y="${cy+15}" fill="#BFD4E2" font-size="10" text-anchor="middle">${unit} ${label}</text>
    </svg>`;
  }
  /* 订单概况：六边形徽标 */
  function hexBadge(num,unit,label,color){
    const pts='64,6 112,33 112,87 64,114 16,87 16,33';
    return `<svg viewBox="0 0 128 120" preserveAspectRatio="xMidYMid meet">
      <polygon points="${pts}" fill="rgba(62,134,180,.18)" stroke="${color}" stroke-width="2" stroke-opacity=".85"
        data-tip="${tipEsc(label+'：'+num+' '+unit)}"/>
      <polygon points="64,14 105,38 105,82 64,106 23,82 23,38" fill="none" stroke="${color}" stroke-width="1" stroke-opacity=".35"/>
      <text x="64" y="56" fill="${color}" font-size="26" font-weight="700" text-anchor="middle">${num}</text>
      <text x="64" y="72" fill="#BFD4E2" font-size="10" text-anchor="middle">${unit} ${label}</text>
      <text x="64" y="88" fill="${color}" font-size="9" text-anchor="middle">◆ ◆ ◆</text>
    </svg>`;
  }
  /* 质量管控：双轴面积曲线（左=合格数量，右=不合格数量；配色即图例，省去底部注释） */
  function dualAxisArea(a,b,ca,cb,months){
    const w=280,h=74,L=34,R=248,T=16,B=58;
    const amin=Math.min(...a)*.92,amax=Math.max(...a)*1.03;
    const bmax=Math.max(...b)*1.18;
    const px=i=>L+i*(R-L)/(a.length-1);
    const ay=v=>B-(v-amin)/(amax-amin)*(B-T);
    const by=v=>B-(v/bmax)*(B-T);
    let s='';
    /* 内嵌图例 */
    s+=`<text x="${L}" y="10" fill="${ca}" font-size="9">■ 合格数量(件)</text>`;
    s+=`<text x="${L+96}" y="10" fill="${cb}" font-size="9">■ 不合格数量(件)</text>`;
    for(let i=0;i<=3;i++){
      const y=B-i*(B-T)/3;
      s+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${R}" y2="${y.toFixed(1)}" stroke="rgba(150,205,220,.12)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-3}" y="${(y+3).toFixed(1)}" fill="${ca}" font-size="9" text-anchor="end">${Math.round(amin+(amax-amin)*i/3)}</text>`;
      s+=`<text x="${R+3}" y="${(y+3).toFixed(1)}" fill="${cb}" font-size="9" text-anchor="start">${Math.round(bmax*i/3)}</text>`;
    }
    [[a,ay,ca],[b,by,cb]].forEach(([data,f,c],k)=>{
      const pts=data.map((v,i)=>[px(i),f(v)]);
      const line=pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
      const gr='da'+(++gid);
      const area=`M${pts[0][0].toFixed(1)},${B} `+pts.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')+` L${pts[pts.length-1][0].toFixed(1)},${B} Z`;
      s+=`<defs><linearGradient id="${gr}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c}" stop-opacity=".36"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>`;
      s+=`<path d="${area}" fill="url(#${gr})"/>`;
      s+=`<polyline points="${line}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
      s+=`<circle cx="${pts[pts.length-1][0].toFixed(1)}" cy="${pts[pts.length-1][1].toFixed(1)}" r="2.6" fill="${c}"/>`;
    });
    a.forEach((v,i)=>{
      s+=`<circle cx="${px(i).toFixed(1)}" cy="${B-10}" r="14" fill="transparent" pointer-events="all"
        data-tip="${tipEsc(months[i]+'：合格 '+v+' 件 / 不合格 '+b[i]+' 件')}"/>`;
    });
    months.forEach((m,i)=>{
      if(i%2===0) s+=`<text x="${px(i).toFixed(1)}" y="${h-2}" fill="#7FA8BF" font-size="9" text-anchor="middle">${m}</text>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${s}</svg>`;
  }
  /* 仓储：四段饼图 */
  function pieChart(items){
    const cx=50,cy=50,r=38,total=items.reduce((a,b)=>a+b.v,0);
    let ang=-Math.PI/2,s='';
    items.forEach((it,i)=>{
      const a2=ang+it.v/total*Math.PI*2;
      const x1=cx+r*Math.cos(ang),y1=cy+r*Math.sin(ang);
      const x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
      const large=(a2-ang)>Math.PI?1:0;
      s+=`<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z"
        fill="${it.c}" opacity=".86" stroke="rgba(11,44,71,.7)" stroke-width="1" class="donut-anim" style="animation-delay:${i*80}ms"
        data-tip="${tipEsc((it.l||('分类'+(i+1)))+'：'+it.v.toLocaleString()+' 件 · '+(it.v/total*100).toFixed(1)+'%')}"/>`;
      ang=a2;
    });
    s+=`<circle cx="${cx}" cy="${cy}" r="17" fill="#0B2C47"/>`;
    s+=`<text x="${cx}" y="${cy-1}" fill="#EAF6FF" font-size="11" font-weight="700" text-anchor="middle">${total.toLocaleString()}</text>`;
    s+=`<text x="${cx}" y="${cy+11}" fill="#7FA8BF" font-size="8" text-anchor="middle">件</text>`;
    return `<svg class="pie-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${s}</svg>`;
  }
  /* 紧凑环形：文字按小尺寸重新配比（在线/离线） */
  function smallRing(pct,color,num,sub){
    const R=42,circ=2*Math.PI*R,off=circ*(1-Math.min(100,pct)/100);
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <circle cx="50" cy="50" r="${R}" fill="none" stroke="rgba(150,205,220,.15)" stroke-width="9"/>
      <circle class="donut-anim" cx="50" cy="50" r="${R}" fill="none" stroke="${color}" stroke-width="9"
        stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 50 50)"
        data-tip="${tipEsc(sub+'：'+num+' · '+pct+'%')}"/>
      <text x="50" y="49" fill="${color}" font-size="26" font-weight="700" text-anchor="middle">${num}</text>
      <text x="50" y="65" fill="#BFD4E2" font-size="12" text-anchor="middle">${sub}</text>
    </svg>`;
  }
  /* 顶部小卡片 */
  function miniCard(v,u,l,c,dec,fmt){
    return `<div class="mc" style="--accent:${c}" data-tip="${tipEsc(l+'：'+v+' '+u)}"><div class="mc-v"><span data-count="${v}" data-dec="${dec||0}" data-fmt="${fmt||''}">0</span><small>${u}</small></div><div class="mc-l">${l}</div></div>`;
  }

  /* ---- 绿色低碳：蓝色工业风小图标 ---- */
  function lcIcon(type){
    const shapes={
      carbon:`
        <path d="M6 17h20v17H6z" fill="#2B6FA3"/>
        <path d="M26 22h8v12h-8z" fill="#245F90"/>
        <path d="M6 17l5-4h20l-5 4z" fill="#6FDCEA"/>
        <path d="M28 7h4v15h-4z" fill="#3E86B4"/>
        <path d="M28 7l2-2 2 2z" fill="#BFD4E2"/>
        <circle cx="30" cy="4" r="2" fill="#BFD4E2" opacity=".75"/>
        <rect x="10" y="22" width="4" height="5" fill="#8FDCF0" opacity=".9"/>
        <rect x="17" y="22" width="4" height="5" fill="#8FDCF0" opacity=".9"/>
        <path d="M4 34h32" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      reduction:`
        <path d="M6 18h20v16H6z" fill="#2B6FA3"/>
        <path d="M6 18l5-4h20l-5 4z" fill="#6FDCEA"/>
        <rect x="10" y="23" width="4" height="4" fill="#8FDCF0"/>
        <rect x="18" y="23" width="4" height="4" fill="#8FDCF0"/>
        <path d="M22 20c3-7 8-11 14-11 1 7-4 14-11 15" fill="#4FD69B"/>
        <path d="M22 24c5-4 9-8 12-13" stroke="#D8FFEF" stroke-width="1.2" fill="none" opacity=".8"/>
        <path d="M4 34h32" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      electric:`
        <path d="M10 8h20v24H10z" fill="#2B6FA3"/>
        <path d="M10 8l3-3h20l-3 3z" fill="#6FDCEA"/>
        <path d="M30 8v24l3-3V5z" fill="#1F5B8A"/>
        <rect x="13" y="12" width="14" height="9" rx="1" fill="#DFF7FF"/>
        <path d="M21 13l-4 6h4l-2 6 6-8h-4z" fill="#F0B75A"/>
        <rect x="13" y="25" width="14" height="2" fill="#8FDCF0" opacity=".8"/>
        <path d="M8 34h24" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      charge:`
        <path d="M11 7h17v25H11z" fill="#2B6FA3"/>
        <path d="M11 7l3-3h17l-3 3z" fill="#6FDCEA"/>
        <path d="M28 7v25l3-3V4z" fill="#1F5B8A"/>
        <rect x="14" y="11" width="11" height="8" rx="1" fill="#DFF7FF"/>
        <path d="M21 12l-4 5h3l-2 5 5-6h-3z" fill="#4FD69B"/>
        <path d="M28 20c6 0 6 8 1 8" stroke="#6FDCEA" stroke-width="2" fill="none"/>
        <rect x="25" y="26" width="4" height="5" rx="1" fill="#3E86B4"/>
        <path d="M8 34h26" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      solar:`
        <circle cx="31" cy="8" r="4" fill="#F0B75A"/>
        <path d="M31 1v2M31 13v2M24 8h2M36 8h2M26 3l1.5 1.5M34.5 11.5L36 13M36 3l-1.5 1.5M27.5 11.5L26 13" stroke="#F0B75A" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M7 18l22-8 7 12-22 8z" fill="#2B6FA3" stroke="#6FDCEA" stroke-width="1"/>
        <path d="M10 18l17-6M14 24l17-6M16 15l6 11M23 12l6 11" stroke="#6FDCEA" stroke-width=".8" opacity=".7"/>
        <path d="M18 28v5M30 24v9" stroke="#3E86B4" stroke-width="2"/>
        <path d="M6 34h28" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      water:`
        <path d="M20 4v8" stroke="#6FDCEA" stroke-width="2"/>
        <ellipse cx="20" cy="12" rx="10" ry="4" fill="none" stroke="#6FDCEA" stroke-width="2.5"/>
        <path d="M20 12v8" stroke="#6FDCEA" stroke-width="2"/>
        <path d="M20 18c5 6 8 10 8 13a8 8 0 0 1-16 0c0-3 3-7 8-13z" fill="#3E86B4"/>
        <path d="M16 27c0 3 2 5 4 6" stroke="#BDEDF7" stroke-width="1.6" fill="none" opacity=".85"/>
        <path d="M8 34h24" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      safety:`
        <path d="M20 5l12 4v10c0 8-5 13-12 16C13 32 8 27 8 19V9z" fill="#2B6FA3" stroke="#6FDCEA" stroke-width="1.5"/>
        <path d="M20 9l8 3v7c0 6-3 10-8 12-5-2-8-6-8-12v-7z" fill="#1F5B8A" opacity=".7"/>
        <path d="M14 19l4 4 8-9" stroke="#6FDCEA" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 35h24" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      trips:`
        <path d="M4 13h20v13H4z" fill="#2B6FA3"/>
        <path d="M24 17h6l6 6v3h-12z" fill="#3E86B4" stroke="#6FDCEA" stroke-width="1"/>
        <path d="M26 19h4l4 4h-8z" fill="#BDEDF7"/>
        <path d="M4 13l4-5h12v5z" fill="#6FDCEA" opacity=".85"/>
        <path d="M8 26h4M24 26h4" stroke="#6FDCEA" stroke-width="1.5" opacity=".7"/>
        <circle cx="11" cy="28" r="3.2" fill="#0B2C47" stroke="#BDEDF7" stroke-width="1.4"/>
        <circle cx="28" cy="28" r="3.2" fill="#0B2C47" stroke="#BDEDF7" stroke-width="1.4"/>
        <path d="M4 35h32" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      pieces:`
        <path d="M6 13l14-6 14 6-14 6z" fill="#6FDCEA"/>
        <path d="M6 13v14l14 6V19z" fill="#2B6FA3"/>
        <path d="M34 13v14l-14 6V19z" fill="#245F90"/>
        <path d="M20 19v14M13 9.5l14 6M27 9.5l-14 6" stroke="#BDEDF7" stroke-width="1" opacity=".65"/>
        <path d="M4 35h32" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      cost:`
        <ellipse cx="20" cy="9" rx="13" ry="5" fill="#F0B75A" opacity=".35"/>
        <path d="M7 9v8c0 2.8 5.8 5 13 5s13-2.2 13-5V9" fill="#2B6FA3"/>
        <ellipse cx="20" cy="9" rx="13" ry="5" fill="none" stroke="#F0B75A" stroke-width="2"/>
        <path d="M7 17v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8" fill="#245F90"/>
        <path d="M7 25c0 2.8 5.8 5 13 5s13-2.2 13-5" fill="none" stroke="#F0B75A" stroke-width="2"/>
        <text x="20" y="24" font-size="13" font-weight="700" fill="#F0B75A" text-anchor="middle">¥</text>`,
      avgcost:`
        <rect x="6" y="7" width="28" height="26" rx="3" fill="#2B6FA3" stroke="#F0B75A" stroke-width="1.5"/>
        <path d="M6 14h28" stroke="#F0B75A" stroke-width="1.2" opacity=".8"/>
        <circle cx="12" cy="10.5" r="1" fill="#F0B75A"/><circle cx="16" cy="10.5" r="1" fill="#F0B75A"/>
        <text x="20" y="27" font-size="14" font-weight="700" fill="#F0B75A" text-anchor="middle">¥</text>
        <path d="M13 30h14" stroke="#6FDCEA" stroke-width="1.2" opacity=".7"/>`,
      design:`
        <path d="M5 18h22v16H5z" fill="#2B6FA3"/>
        <path d="M5 18l4-4h22l-4 4z" fill="#6FDCEA"/>
        <path d="M27 23h8v11h-8z" fill="#245F90"/>
        <path d="M8 34h26" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>
        <path d="M9 8h22" stroke="#F0B75A" stroke-width="2"/>
        <path d="M9 5v6M31 5v6" stroke="#F0B75A" stroke-width="1.5"/>`,
      output:`
        <path d="M8 14l12-6 12 6v14l-12 6-12-6z" fill="#2B6FA3" stroke="#6FDCEA" stroke-width="1"/>
        <path d="M8 14l12 6 12-6M20 20v14" fill="none" stroke="#6FDCEA" stroke-width="1" opacity=".7"/>
        <path d="M15 21l4 4 7-8" fill="none" stroke="#4FD69B" stroke-width="2.5" stroke-linecap="round"/>`,
      util:`
        <path d="M8 28a14 14 0 1 1 24 0" fill="none" stroke="rgba(150,205,220,.2)" stroke-width="6"/>
        <path d="M8 28a14 14 0 0 1 24 0" fill="none" stroke="${CY}" stroke-width="6" stroke-linecap="butt"/>
        <path d="M20 28l8-9" stroke="#F0B75A" stroke-width="2"/>
        <circle cx="20" cy="28" r="2.5" fill="#F0B75A"/>`,
      oee:`
        <circle cx="20" cy="20" r="11" fill="#2B6FA3" stroke="#6FDCEA" stroke-width="2"/>
        <circle cx="20" cy="20" r="5" fill="#0B2C47" stroke="#6FDCEA" stroke-width="1.5"/>
        <path d="M20 5v5M20 30v5M5 20h5M30 20h5M9 9l3.5 3.5M27.5 27.5L31 31M31 9l-3.5 3.5M12.5 27.5L9 31" stroke="#6FDCEA" stroke-width="2.5" stroke-linecap="round"/>`,
      days:`
        <rect x="7" y="9" width="26" height="24" rx="2" fill="#2B6FA3" stroke="#6FDCEA" stroke-width="1.5"/>
        <path d="M7 16h26" stroke="#6FDCEA" stroke-width="1.5"/>
        <path d="M14 6v6M26 6v6" stroke="#6FDCEA" stroke-width="2"/>
        <path d="M14 23l4 4 8-9" fill="none" stroke="#4FD69B" stroke-width="2.5" stroke-linecap="round"/>`,
      qaonce:`
        <path d="M20 4l13 5v10c0 8-5 13-13 17C12 32 7 27 7 19V9z" fill="#2B6FA3" stroke="#6FDCEA" stroke-width="1.5"/>
        <path d="M13 19l5 5 9-11" fill="none" stroke="#4FD69B" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 36h28" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      qaoverall:`
        <circle cx="20" cy="20" r="13" fill="#2B6FA3" stroke="#6FDCEA" stroke-width="1.6"/>
        <circle cx="20" cy="20" r="9" fill="none" stroke="#4FD69B" stroke-width="1.3" opacity=".75"/>
        <path d="M14 20l4 4 8-9" fill="none" stroke="#4FD69B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 36h28" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      qabad:`
        <path d="M20 5l15 26H5z" fill="#2B6FA3" stroke="#F0B75A" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M20 12v10" stroke="#F0B75A" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="20" cy="26" r="1.6" fill="#F0B75A"/>
        <path d="M6 36h28" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      qarecheck:`
        <rect x="6" y="8" width="28" height="24" rx="2" fill="#2B6FA3" stroke="#6FDCEA" stroke-width="1.5"/>
        <circle cx="17" cy="18" r="6" fill="none" stroke="#6FDCEA" stroke-width="1.8"/>
        <path d="M21.5 22.5L28 29" stroke="#6FDCEA" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M14 18h6M17 15v6" stroke="#F0B75A" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M6 36h28" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`,
      qaloss:`
        <path d="M6 9v22h28" stroke="#6FDCEA" stroke-width="1.5" opacity=".7" fill="none"/>
        <path d="M9 14l7 6 6-3 10 8" fill="none" stroke="#FF5D6C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M28 20h5v5" fill="none" stroke="#FF5D6C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 36h28" stroke="#6FDCEA" stroke-width="1.5" opacity=".6"/>`
    };
    return `<svg viewBox="0 0 40 40" aria-hidden="true">${shapes[type]||shapes.carbon}</svg>`;
  }
  /* 两列三行：首行 碳排放/碳减排，中间 用电/用水，末行 光伏发电/充电桩 */
  function lowCarbonGrid(){
    const items=[
      ['carbon','1,360','碳排放(t)'],
      ['reduction','328','碳减排(t)'],
      ['electric','1,416','用电(万kWh)'],
      ['water','20.6','用水(t)'],
      ['solar','1,410','光伏发电(万kWh)'],
      ['charge','43','充电桩(个)']
    ];
    return `<div class="lc-grid">${items.map(([ic,v,l],i)=>`
      <div class="lc-item fade-up" style="animation-delay:${i*55}ms" data-tip="${tipEsc(l+'：'+v)}">
        <div class="lc-icon">${lcIcon(ic)}</div>
        <div class="lc-data">
          <div class="lc-v"><span data-count="${v.replace(/,/g,'')}" data-dec="${v.includes('.')?1:0}" data-fmt="${v.includes(',')?'comma':''}">0</span></div>
          <div class="lc-l">${l}</div>
        </div>
      </div>`).join('')}</div>`;
  }

  /* ---- 智慧物流：三指标 + 配送状态分段条（无曲线） ---- */
  function logisticsBody(){
    return `<div class="lg-body">
      <div class="lg-kpis">
        <div class="lg-kpi" data-tip="在途：36 单"><div class="lgv"><span data-count="36">0</span><small>单</small></div><div class="lgl">在途</div></div>
        <div class="lg-kpi" data-tip="配送及时率：96.4%"><div class="lgv"><span data-count="96.4" data-dec="1">0</span><small>%</small></div><div class="lgl">配送及时率</div></div>
        <div class="lg-kpi" data-tip="平均配送公里：42.6 km"><div class="lgv"><span data-count="42.6" data-dec="1">0</span><small>km</small></div><div class="lgl">平均配送公里</div></div>
      </div>
      <div class="lg-flow">
        <div class="lg-flowhead"><span>配送计划执行率</span><b><span data-count="92.8" data-dec="1">0</span>%</b></div>
        <div class="lg-bar">
          <i data-w="93.9" style="background:linear-gradient(90deg,${BL},${CY})" data-tip="已配送：1,756 单"></i>
          <i data-w="1.9" style="background:${BL}" data-tip="在途：36 单"></i>
          <i data-w="0.2" style="background:${RD}" data-tip="逾期：4 单"></i>
        </div>
        <div class="lg-legend">
          <span><i style="background:${CY}"></i>已配送 1,756</span>
          <span><i style="background:${BL}"></i>在途 36</span>
          <span><i style="background:${RD}"></i>逾期 4</span>
        </div>
      </div>
    </div>`;
  }

  /* ===== 物流调度详情图表 ===== */
  /* 1 配送计划 vs 已配送：12月横向堆叠条（已配送 + 在途/逾期 = 计划） */
  function lgPlanDeliver(){
    const plan =[142,158,170,152,176,164,188,172,196,182,174,202];
    const done =[132,150,161,140,166,152,176,160,183,171,163,190];
    const w=520,h=200,L=40,R=44,T=26,rowH=(h-T-6)/12;
    const max=210, sx=(w-L-R)/max;
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
    s+=`<text x="4" y="12" fill="${BL}" font-size="9">■ 已配送</text>`;
    s+=`<text x="72" y="12" fill="${OR}" font-size="9">■ 在途/逾期</text>`;
    s+=`<text x="${w-4}" y="12" fill="#7FA8BF" font-size="9" text-anchor="end">单位：单</text>`;
    [0,70,140,210].forEach(v=>{
      const gx=L+v*sx;
      s+=`<line x1="${gx.toFixed(1)}" y1="${T-2}" x2="${gx.toFixed(1)}" y2="${h-6}" stroke="rgba(150,205,220,.12)" stroke-dasharray="2 3"/>`;
      s+=`<text x="${gx.toFixed(1)}" y="${h-1}" fill="#7FA8BF" font-size="8" text-anchor="middle">${v}</text>`;
    });
    MONTHS.forEach((m,i)=>{
      const yy=T+i*rowH+1, bh=Math.max(3,rowH-4);
      const dw=done[i]*sx, pw=plan[i]*sx, rem=pw-dw;
      s+=`<text x="${L-5}" y="${(yy+bh/2+3).toFixed(1)}" fill="#7FA8BF" font-size="8.5" text-anchor="end">${m}</text>`;
      s+=`<rect x="${L}" y="${yy.toFixed(1)}" width="${pw.toFixed(1)}" height="${bh.toFixed(1)}" fill="rgba(62,134,180,.18)"/>`;
      s+=`<rect class="bar-anim" x="${L}" y="${yy.toFixed(1)}" width="${dw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${BL}" style="animation-delay:${i*35}ms"
        data-tip="${tipEsc(m+' · 已配送：'+done[i]+' 单')}"/>`;
      s+=`<rect class="bar-anim" x="${(L+dw).toFixed(1)}" y="${yy.toFixed(1)}" width="${Math.max(1,rem).toFixed(1)}" height="${bh.toFixed(1)}" fill="${OR}" opacity=".85" style="animation-delay:${i*35+120}ms"
        data-tip="${tipEsc(m+' · 在途/逾期：'+(plan[i]-done[i])+' 单')}"/>`;
      s+=`<text x="${(L+pw+4).toFixed(1)}" y="${(yy+bh/2+3).toFixed(1)}" fill="#BFD4E2" font-size="8">${plan[i]}</text>`;
    });
    return s+`</svg>`;
  }
  /* 2 配送计划执行：12月各状态数量堆叠柱（已发运/部分发运/待发运/异常） */
  function lgPlanStatus(){
    const series=[
      {n:'已发运',c:GR, d:[118,130,140,128,150,138,160,146,168,154,162,178]},
      {n:'部分发运',c:BL, d:[14,16,12,18,14,20,16,18,14,20,16,14]},
      {n:'待发运',c:OR, d:[8,10,14,6,12,8,12,10,14,8,10,10]},
      {n:'异常',c:RD, d:[2,2,4,0,2,2,4,2,2,4,2,0]}
    ];
    const w=520,h=200,L=36,R=10,T=30,B=24,plotW=w-L-R,plotH=h-T-B,slot=plotW/12;
    const totals=MONTHS.map((_,i)=>series.reduce((a,s)=>a+(s.d[i]||0),0));
    const max=Math.max(...totals)*1.1;
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
    series.forEach((se,k)=>{
      const lx=36+k*112;
      s+=`<rect x="${lx}" y="6" width="8" height="8" fill="${se.c}"/>`;
      s+=`<text x="${lx+11}" y="14" fill="#BFD4E2" font-size="9">${se.n}</text>`;
    });
    for(let k=0;k<=4;k++){
      const yy=T+plotH-plotH*k/4;
      s+=`<line x1="${L}" y1="${yy.toFixed(1)}" x2="${w-R}" y2="${yy.toFixed(1)}" stroke="rgba(150,205,220,.12)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-4}" y="${(yy+3).toFixed(1)}" fill="#7FA8BF" font-size="8" text-anchor="end">${Math.round(max*k/4)}</text>`;
    }
    MONTHS.forEach((m,i)=>{
      let acc=0;
      series.forEach(se=>{
        const v=se.d[i]||0, bh=v/max*plotH, y=T+plotH-acc-bh;
        acc+=bh;
        if(v>0) s+=`<rect class="bar-anim" x="${(L+i*slot+slot*.2).toFixed(1)}" y="${y.toFixed(1)}" width="${(slot*.6).toFixed(1)}" height="${bh.toFixed(1)}" fill="${se.c}" style="animation-delay:${i*30}ms"
          data-tip="${tipEsc(m+' · '+se.n+'：'+v+' 单')}"/>`;
      });
      s+=`<text x="${(L+i*slot+slot/2).toFixed(1)}" y="${h-8}" fill="#7FA8BF" font-size="8.5" text-anchor="middle">${m}</text>`;
    });
    return s+`</svg>`;
  }
  /* 3 准时率+执行率：两张卡 + 12月待签收/已签收分组柱 */
  function lgRateSign(){
    const sign=[
      {n:'待签收',c:BL,d:[12,16,14,18,15,20,17,14,22,18,16,19]},
      {n:'已签收',c:GR,d:[108,118,126,112,132,122,140,128,146,138,132,152]}
    ];
    const w=520,h=200;
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
    s+=`<rect x="6" y="4" width="248" height="34" rx="3" fill="rgba(62,134,180,.12)" stroke="${CY}" stroke-opacity=".4"/>`;
    s+=`<text x="16" y="17" fill="#BFD4E2" font-size="9">配送准时率</text>`;
    s+=`<text x="16" y="33" fill="${CY}" font-size="18" font-weight="700">96.4<tspan font-size="10" fill="#BFD4E2"> %</tspan></text>`;
    s+=`<rect x="266" y="4" width="248" height="34" rx="3" fill="rgba(79,214,155,.10)" stroke="${GR}" stroke-opacity=".4"/>`;
    s+=`<text x="276" y="17" fill="#BFD4E2" font-size="9">配送计划执行率</text>`;
    s+=`<text x="276" y="33" fill="${GR}" font-size="18" font-weight="700">92.8<tspan font-size="10" fill="#BFD4E2"> %</tspan></text>`;
    const L=36,R=10,T=52,B=22,plotW=w-L-R,plotH=h-T-B,slot=plotW/12;
    const max=160;
    sign.forEach((se,k)=>{
      const lx=300+k*104;
      s+=`<rect x="${lx}" y="45" width="8" height="8" fill="${se.c}"/>`;
      s+=`<text x="${lx+11}" y="53" fill="#BFD4E2" font-size="9">${se.n}</text>`;
    });
    for(let k=0;k<=4;k++){
      const yy=T+plotH-plotH*k/4;
      s+=`<line x1="${L}" y1="${yy.toFixed(1)}" x2="${w-R}" y2="${yy.toFixed(1)}" stroke="rgba(150,205,220,.12)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-4}" y="${(yy+3).toFixed(1)}" fill="#7FA8BF" font-size="8" text-anchor="end">${Math.round(max*k/4)}</text>`;
    }
    MONTHS.forEach((m,i)=>{
      sign.forEach((se,k)=>{
        const v=se.d[i],bh=v/max*plotH,bw=Math.min(slot*.3,11);
        const x=L+i*slot+slot*.18+k*(bw+2);
        s+=`<rect class="bar-anim" x="${x.toFixed(1)}" y="${(T+plotH-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${se.c}" style="animation-delay:${i*30+k*40}ms"
          data-tip="${tipEsc(m+' · '+se.n+'：'+v+' 单')}"/>`;
      });
      s+=`<text x="${(L+i*slot+slot/2).toFixed(1)}" y="${h-6}" fill="#7FA8BF" font-size="8.5" text-anchor="middle">${m}</text>`;
    });
    return s+`</svg>`;
  }
  /* 4 库位齐套执行：围绕库位占用/齐套下钻，标题改为"库位齐套执行" */
  function lgStorageKit(){
    const zones=[
      ['原料库区','占用 428','可用 96'],['半成品库','占用 312','可用 78'],
      ['成品库区','占用 386','可用 64'],['冷链库区','占用 204','可用 82'],
      ['呆滞库区','占用 88','可用 46'],['外协库区','占用 130','可用 36']
    ];
    const kits=[
      ['齐套工单','已齐套 1,024'],['欠料工单','欠料 96'],
      ['待齐套','待齐套 132'],['缺料品类','缺料 24 类'],
      ['齐套准确率','98.2%'],['齐套及时率','94.6%']
    ];
    return `<div class="ld-drill">
      <div class="ld-drill-top">
        <div class="ld-dm" style="--accent:${GR}"><div class="dm-h"><span>库位占用率</span><b>74.6<small style="font-size:10px">%</small></b></div>
          <div class="lg-bar" style="margin-top:5px"><i data-w="74.6" style="background:linear-gradient(90deg,${GR},${CY})"></i></div></div>
        <div class="ld-dm" style="--accent:${OR}"><div class="dm-h"><span>齐套工单率</span><b>88.5<small style="font-size:10px">%</small></b></div>
          <div class="lg-bar" style="margin-top:5px"><i data-w="88.5" style="background:linear-gradient(90deg,${OR},${BL})"></i></div></div>
      </div>
      <div class="ld-drill-list">
        <div class="ld-dcol">${zones.map((z,i)=>`<div class="ld-di"><span><i style="display:inline-block;width:6px;height:6px;border-radius:1px;background:${CY};margin-right:5px"></i>${z[0]} · ${z[1]}</span><b>${z[2]}</b></div>`).join('')}</div>
        <div class="ld-dcol">${kits.map((k,i)=>`<div class="ld-di"><span><i style="display:inline-block;width:6px;height:6px;border-radius:1px;background:${i%2?OR:GR};margin-right:5px"></i>${k[0]}</span><b>${k[1]}</b></div>`).join('')}</div>
      </div>
    </div>`;
  }
  /* 5 在途配送趋势：12月不同物流状态堆叠面积（在途/配送中/待签收/逾期） */
  function lgTransitTrend(){
    const series=[
      {n:'在途',c:OR, d:[26,30,28,34,32,38,35,40,37,42,39,36]},
      {n:'配送中',c:BL, d:[18,20,24,22,26,24,28,26,30,28,32,30]},
      {n:'待签收',c:CY, d:[10,12,11,14,13,16,15,17,16,18,17,15]},
      {n:'逾期',c:RD, d:[2,3,2,4,3,4,3,5,4,4,3,4]}
    ];
    const w=520,h=200,L=34,R=10,T=30,B=22,plotW=w-L-R,plotH=h-T-B;
    const totals=MONTHS.map((_,i)=>series.reduce((a,s)=>a+s.d[i],0));
    const max=Math.max(...totals)*1.1;
    const x=i=>L+i*plotW/11, y=v=>T+plotH-v/max*plotH;
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
    series.forEach((se,k)=>{ const lx=34+k*112;
      s+=`<rect x="${lx}" y="6" width="8" height="8" fill="${se.c}"/>`;
      s+=`<text x="${lx+11}" y="14" fill="#BFD4E2" font-size="9">${se.n}</text>`;
    });
    for(let k=0;k<=4;k++){
      const yy=T+plotH-plotH*k/4;
      s+=`<line x1="${L}" y1="${yy.toFixed(1)}" x2="${w-R}" y2="${yy.toFixed(1)}" stroke="rgba(150,205,220,.12)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-4}" y="${(yy+3).toFixed(1)}" fill="#7FA8BF" font-size="8" text-anchor="end">${Math.round(max*k/4)}</text>`;
    }
    const grad=uid();
    let acc=new Array(12).fill(0);
    series.forEach((se,si)=>{
      const upper=acc.map((a,i)=>a+se.d[i]);
      const top=upper.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      const bot=acc.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).reverse();
      const op=(.30).toFixed(2);
      s+=`<polygon class="fade-up" points="${top.concat(bot).join(' ')}" fill="${se.c}" fill-opacity="${op}" stroke="${se.c}" stroke-opacity=".85" stroke-width="1.2" style="animation-delay:${si*90}ms"/>`;
      acc=upper;
    });
    MONTHS.forEach((m,i)=>{
      const detail=series.map(se=>se.n+' '+se.d[i]).join(' / ');
      s+=`<circle cx="${x(i).toFixed(1)}" cy="${y(totals[i]).toFixed(1)}" r="12" fill="transparent" pointer-events="all"
        data-tip="${tipEsc(m+' · 合计 '+totals[i]+' 单 / '+detail)}"/>`;
      s+=`<text x="${x(i).toFixed(1)}" y="${h-6}" fill="#7FA8BF" font-size="8.5" text-anchor="middle">${m}</text>`;
    });
    return s+`</svg>`;
  }
  /* 6 物流明细：绿色低碳式四指标卡（车次/件数/成本/单趟成本） */
  function lgLogisticsDetail(){
    const items=[
      ['trips','8','车','发运总车次',CY],
      ['pieces','13','件','发运总件数',CY],
      ['cost','17,550.00','元','运输总成本',OR],
      ['avgcost','2,193.75','元/车','平均单趟成本',OR]
    ];
    return `<div class="ld-logi-grid">${items.map(([ic,v,u,l,c],i)=>`
      <div class="ld-logi fade-up" style="--accent:${c};animation-delay:${i*55}ms">
        <div class="li-ic">${lcIcon(ic)}</div>
        <div class="li-d">
          <div class="li-v"><span data-count="${v.replace(/,/g,'')}" data-dec="${v.includes('.')?2:0}" data-fmt="${v.includes(',')?'comma':''}">0</span><small>${u}</small></div>
          <div class="li-l">${l}</div>
        </div>
      </div>`).join('')}</div>`;
  }

  /* ================= 质量管控详情 六模块 ================= */
  /* 1 一次/整体合格率：双饼图 */
  function qaPassPies(){
    return `<div class="pie-pair">
      <div class="pp-unit fade-up">
        <div class="pp-name">一次检验合格率</div>
        ${pieDonut(96.8,CY,'96.8%','一次检验合格率')}
        <div class="pp-val">合格 12,960 / 检验 13,388 件</div>
      </div>
      <div class="pp-unit fade-up" style="animation-delay:90ms">
        <div class="pp-name">整体合格率</div>
        ${pieDonut(99.1,GR,'99.1%','整体合格率')}
        <div class="pp-val">一次 + 复检 · 目标 99%</div>
      </div>
    </div>`;
  }
  /* 2 待复检分析：物料分类 × 状态数量矩阵 */
  function qaRecheck(){
    const rows=[
      {cat:'结构材料',done:186,check:8,wait:5,iso:2},
      {cat:'辅材',    done:152,check:6,wait:3,iso:1},
      {cat:'装修主材',done:128,check:4,wait:3,iso:0},
      {cat:'构件', done:96, check:3,wait:5,iso:2}
    ];
    return `<div class="qa-rc">
      <div class="qa-rc-top">
        <div class="qa-rc-sum" style="--accent:${OR}"><span>待复检</span><b>42</b></div>
        <div class="qa-rc-sum" style="--accent:${CY}"><span>复检中</span><b>21</b></div>
        <div class="qa-rc-sum" style="--accent:${BL}"><span>待检</span><b>16</b></div>
        <div class="qa-rc-sum" style="--accent:${RD}"><span>已完成</span><b>5</b></div>
      </div>
      <table class="qa-rc-tb">
        <thead><tr><th>物料分类</th><th>已检验</th><th>复检中</th><th>待检</th><th>已完成</th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td>${r.cat}</td>
          <td><span class="qa-pill done">${r.done}</span></td>
          <td><span class="qa-pill check">${r.check}</span></td>
          <td><span class="qa-pill wait">${r.wait}</span></td>
          <td><span class="qa-pill iso">${r.iso}</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  }
  /* 3 合格率趋势：按物料分类的合格/不合格数量双轴双曲线 */
  function qaPassTrend(){
    const cats=['结构材料','辅材','装修主材','构件','钢筋网片','外购件'];
    const ok=[3260,2480,1980,1460,1180,860], ng=[42,26,18,12,9,7];
    const w=520,h=200,L=42,R=40,T=30,B=26,pw=w-L-R,ph=h-T-B;
    const okMax=3500,ngMax=50;
    const x=i=>L+i*pw/(cats.length-1), yOk=v=>T+ph-v/okMax*ph, yNg=v=>T+ph-v/ngMax*ph;
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
    s+=`<rect x="${L}" y="6" width="9" height="3" fill="${CY}"/><text x="${L+13}" y="11" fill="#BFD4E2" font-size="9">合格数量</text>`;
    s+=`<rect x="${L+92}" y="6" width="9" height="3" fill="${OR}"/><text x="${L+105}" y="11" fill="#BFD4E2" font-size="9">不合格数量</text>`;
    s+=`<text x="${w-4}" y="11" fill="#7FA8BF" font-size="8" text-anchor="end">左轴 合格 / 右轴 不合格</text>`;
    for(let k=0;k<=4;k++){
      const yy=T+ph-ph*k/4;
      s+=`<line x1="${L}" y1="${yy.toFixed(1)}" x2="${w-R}" y2="${yy.toFixed(1)}" stroke="rgba(150,205,220,.12)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-4}" y="${(yy+3).toFixed(1)}" fill="${CY}" font-size="8" text-anchor="end">${Math.round(okMax*k/4)}</text>`;
      s+=`<text x="${w-R+4}" y="${(yy+3).toFixed(1)}" fill="${OR}" font-size="8">${Math.round(ngMax*k/4)}</text>`;
    }
    const okPts=ok.map((v,i)=>`${x(i).toFixed(1)},${yOk(v).toFixed(1)}`).join(' ');
    const ngPts=ng.map((v,i)=>`${x(i).toFixed(1)},${yNg(v).toFixed(1)}`).join(' ');
    s+=`<polygon points="${x(0).toFixed(1)},${(T+ph).toFixed(1)} ${okPts} ${x(ok.length-1).toFixed(1)},${(T+ph).toFixed(1)}" fill="${CY}" fill-opacity=".1"/>`;
    s+=`<polyline class="line-anim" points="${okPts}" fill="none" stroke="${CY}" stroke-width="2"/>`;
    s+=`<polyline class="line-anim" points="${ngPts}" fill="none" stroke="${OR}" stroke-width="2"/>`;
    ok.forEach((v,i)=>{
      s+=`<circle cx="${x(i).toFixed(1)}" cy="${yOk(v).toFixed(1)}" r="2.8" fill="${CY}"/>`;
      s+=`<circle cx="${x(i).toFixed(1)}" cy="${yNg(ng[i]).toFixed(1)}" r="2.8" fill="${OR}"/>`;
      s+=`<circle cx="${x(i).toFixed(1)}" cy="${yOk(v).toFixed(1)}" r="10" fill="transparent" pointer-events="all"
        data-tip="${tipEsc(cats[i]+'：合格 '+v+' 件 / 不合格 '+ng[i]+' 件')}"/>`;
    });
    cats.forEach((c,i)=>{ s+=`<text x="${x(i).toFixed(1)}" y="${h-9}" fill="#7FA8BF" font-size="8.5" text-anchor="middle">${c}</text>`; });
    return s+`</svg>`;
  }
  /* 4 生产经营：成品/物料 12 个月金额（万元）并排柱 */
  function qaOperation(){
    const fin=[318,342,356,331,378,402,388,420,438,412,455,478];
    const mat=[206,224,238,215,252,268,258,282,296,278,304,322];
    const w=520,h=200,L=40,R=10,T=30,B=24,pw=w-L-R,ph=h-T-B,slot=pw/12,max=500;
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
    s+=`<rect x="${L}" y="6" width="9" height="8" fill="${BL}"/><text x="${L+13}" y="14" fill="#BFD4E2" font-size="9">成品</text>`;
    s+=`<rect x="${L+72}" y="6" width="9" height="8" fill="${CY}"/><text x="${L+85}" y="14" fill="#BFD4E2" font-size="9">物料</text>`;
    s+=`<text x="${w-4}" y="14" fill="#7FA8BF" font-size="8" text-anchor="end">单位：万元</text>`;
    for(let k=0;k<=4;k++){
      const yy=T+ph-ph*k/4;
      s+=`<line x1="${L}" y1="${yy.toFixed(1)}" x2="${w-R}" y2="${yy.toFixed(1)}" stroke="rgba(150,205,220,.12)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-4}" y="${(yy+3).toFixed(1)}" fill="#7FA8BF" font-size="8" text-anchor="end">${Math.round(max*k/4)}</text>`;
    }
    MONTHS.forEach((m,i)=>{
      const bw=Math.min(slot*.3,12),x1=L+i*slot+slot*.16,x2=x1+bw+2;
      s+=`<rect class="bar-anim" x="${x1.toFixed(1)}" y="${(T+ph-fin[i]/max*ph).toFixed(1)}" width="${bw.toFixed(1)}" height="${(fin[i]/max*ph).toFixed(1)}" fill="${BL}" style="animation-delay:${i*30}ms"
        data-tip="${tipEsc(m+' · 成品：'+fin[i]+' 万元')}"/>`;
      s+=`<rect class="bar-anim" x="${x2.toFixed(1)}" y="${(T+ph-mat[i]/max*ph).toFixed(1)}" width="${bw.toFixed(1)}" height="${(mat[i]/max*ph).toFixed(1)}" fill="${CY}" style="animation-delay:${i*30+40}ms"
        data-tip="${tipEsc(m+' · 物料：'+mat[i]+' 万元')}"/>`;
      s+=`<text x="${(L+i*slot+slot/2).toFixed(1)}" y="${h-8}" fill="#7FA8BF" font-size="8.5" text-anchor="middle">${m}</text>`;
    });
    return s+`</svg>`;
  }
  /* 5 交付趋势：12 个月按物料分类交付数量堆叠柱 */
  function qaDelivery(){
    const series=[
      {n:'结构材料',c:CY,d:[86,92,98,90,104,112,106,118,124,120,130,138]},
      {n:'辅材',c:BL,d:[48,54,60,52,62,68,64,72,76,74,80,86]},
      {n:'装修主材',c:GR,d:[30,34,38,32,42,46,42,50,54,52,58,64]},
      {n:'构件',c:OR,d:[18,20,24,20,26,30,28,32,36,34,38,42]}
    ];
    const w=520,h=200,L=36,R=10,T=30,B=24,pw=w-L-R,ph=h-T-B,slot=pw/12;
    const totals=MONTHS.map((_,i)=>series.reduce((a,s)=>a+s.d[i],0));
    const max=Math.ceil(Math.max(...totals)*1.1/50)*50;
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
    series.forEach((se,k)=>{ const lx=34+k*112;
      s+=`<rect x="${lx}" y="6" width="8" height="8" fill="${se.c}"/>`;
      s+=`<text x="${lx+11}" y="14" fill="#BFD4E2" font-size="9">${se.n}</text>`;
    });
    for(let k=0;k<=4;k++){
      const yy=T+ph-ph*k/4;
      s+=`<line x1="${L}" y1="${yy.toFixed(1)}" x2="${w-R}" y2="${yy.toFixed(1)}" stroke="rgba(150,205,220,.12)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-4}" y="${(yy+3).toFixed(1)}" fill="#7FA8BF" font-size="8" text-anchor="end">${Math.round(max*k/4)}</text>`;
    }
    MONTHS.forEach((m,i)=>{
      let acc=0;
      series.forEach(se=>{
        const v=se.d[i],bh=v/max*ph,y=T+ph-acc-bh;acc+=bh;
        s+=`<rect class="bar-anim" x="${(L+i*slot+slot*.2).toFixed(1)}" y="${y.toFixed(1)}" width="${(slot*.6).toFixed(1)}" height="${bh.toFixed(1)}" fill="${se.c}" style="animation-delay:${i*28}ms"
          data-tip="${tipEsc(m+' · '+se.n+'：'+v+' 件')}"/>`;
      });
      s+=`<text x="${(L+i*slot+slot/2).toFixed(1)}" y="${h-8}" fill="#7FA8BF" font-size="8.5" text-anchor="middle">${m}</text>`;
    });
    return s+`</svg>`;
  }
  /* 6 质量明细：复用综合生产关键指标网格（5 项，末项跨两列） */
  function qaDetailGrid(){
    const items=[
      {ic:'qaonce',v:'96.8',dec:1,u:'%',l:'一次检验合格率'},
      {ic:'qaoverall',v:'99.1',dec:1,u:'%',l:'整体合格率'},
      {ic:'qabad',v:'68',u:'件',l:'不良品数量'},
      {ic:'qarecheck',v:'42',u:'件',l:'待复检产品'},
      {ic:'qaloss',wide:true,html:`<span data-count="1.2" data-dec="1">0</span><small>%</small> <span style="color:var(--text-tertiary)">/</span> <span data-count="0.8" data-dec="1">0</span><small>%</small>`,l:'质量损失（成品/物料）'}
    ];
    return `<div class="km-grid">${items.map((it,i)=>`
      <div class="lc-item fade-up${it.wide?' km-wide':''}" style="animation-delay:${i*45}ms;--accent:${[CY,GR,OR,BL,RD][i]}"
        data-tip="${tipEsc(it.l+'：'+(it.v!=null?it.v+(it.u||''):'成品1.2% / 物料0.8%'))}">
        <div class="lc-icon">${lcIcon(it.ic)}</div>
        <div class="lc-data">
          <div class="lc-v">${it.html||`<span data-count="${it.v}" data-dec="${it.dec||0}">0</span><small>${it.u}</small>`}</div>
          <div class="lc-l">${it.l}</div>
        </div>
      </div>`).join('')}</div>`;
  }

  /* ---- 安全生产：半环仪表分段显示项目阶段 ---- */
  function safetyGauge(total,parts){
    const cx=52,cy=66,r=38,w=9;
    const pt=(rad,a)=>[cx+rad*Math.cos(a*Math.PI/180),cy+rad*Math.sin(a*Math.PI/180)];
    const arc=(rad,a0,a1)=>{
      const p0=pt(rad,a0),p1=pt(rad,a1);
      return 'M'+p0[0].toFixed(1)+' '+p0[1].toFixed(1)+' A'+rad+' '+rad+' 0 0 1 '+p1[0].toFixed(1)+' '+p1[1].toFixed(1);
    };
    let s='<path d="'+arc(r,180,360)+'" fill="none" stroke="rgba(150,205,220,.16)" stroke-width="'+w+'" stroke-linecap="round"/>';
    let acc=0;
    parts.forEach(p=>{
      const a0=180+360*acc/total, a1=180+360*(acc+p.v)/total;
      s+='<path class="donut-anim" d="'+arc(r,a0,a1)+'" fill="none" stroke="'+p.c+'" stroke-width="'+w+'" data-tip="'+tipEsc(p.l+'：'+p.v+' 个 · '+(p.v/total*100).toFixed(1)+'%')+'"/>';
      acc+=p.v;
    });
    for(let i=0;i<=12;i++){
      const a=180+i*15, p0=pt(r-14,a), p1=pt(r-9,a);
      s+='<line x1="'+p0[0].toFixed(1)+'" y1="'+p0[1].toFixed(1)+'" x2="'+p1[0].toFixed(1)+'" y2="'+p1[1].toFixed(1)+'" stroke="'+(i%3===0?CY:'rgba(111,220,234,.5)')+'" stroke-width="1.5"/>';
    }
    return '<svg viewBox="0 0 104 82" preserveAspectRatio="xMidYMid meet">'+s+'</svg>';
  }
  function safetyBody(){
    const stages=[
      {l:'未排量',v:6,c:'#7FA8BF'},
      {l:'排产量',v:10,c:BL},
      {l:'生产量',v:12,c:CY},
      {l:'入库量',v:8,c:GR},
      {l:'出库量',v:7,c:'#5BC8D8'},
      {l:'待签收量',v:3,c:OR},
      {l:'已签收量',v:2,c:'#4FD69B'}
    ];
    const total=stages.reduce((a,b)=>a+b.v,0);
    return `<div class="af-body">
      <div class="af-top">
        <div class="af-list">${stages.map((s,i)=>`
          <div class="af-item fade-up" style="animation-delay:${i*35}ms">
            <span><i style="background:${s.c}"></i>${s.l}</span><b>${s.v}</b>
          </div>`).join('')}</div>
        <div class="af-gauge">${safetyGauge(total,stages)}
          <div class="af-gtxt"><b>${total}<small>个</small></b><div class="af-gcap">项目总数</div></div>
        </div>
      </div>
      <div class="af-foot"><span class="af-dia"></span><span class="af-lbl">安全生产天数</span>
        <b><span data-count="286">0</span><small>天</small></b></div>
    </div>`;
  }

  /* ---- 运营分析 8 模块数据（聚焦型布局，减少拥挤） ---- */
  const MONTHS=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const OPS = [
    /* 1 工厂产能：大环（产能总数）+ 产能（月）/ 产品利用率 两条信息栏 */
    { title:'工厂产能', accent:CY, detail:'capacity', focus:true,
      body:`
        <div class="cap-body">
          <div class="cap-ring">${heroRing(86.4,CY,'14,900','m³','产能总数')}</div>
          <div class="cap-info">
            <div class="info-bar"><span class="ib-ic">▤</span><div class="ib-t">
              <div class="ib-l">产能（月）</div>
              <div class="ib-v"><span data-count="12860" data-fmt="comma">0</span><small>m³</small></div></div></div>
            <div class="info-bar"><span class="ib-ic">％</span><div class="ib-t">
              <div class="ib-l">产品利用率</div>
              <div class="ib-v"><span data-count="86.4" data-dec="1">0</span><small>%</small></div></div></div>
          </div>
        </div>` },
    /* 2 订单概况：六边形项目数 + 构件/混凝土模块 方量双斜纹柱对比 */
    { title:'订单概况', accent:GR, focus:true,
      body:`
        <div class="ord-body">
          <div class="hex-wrap">${hexBadge('48','个','项目数',GR)}</div>
          <div class="hatch-bars">
            <div><div class="hb-top"><span>构件方量</span><b style="--bar-c:${GR}"><span data-count="24600" data-fmt="comma">0</span><small>m³</small></b></div>
              <div class="hb-track"><i class="hb-fill" data-w="100" style="--bar-c:${GR}"></i></div></div>
            <div><div class="hb-top"><span>混凝土模块方量</span><b style="--bar-c:${OR}"><span data-count="18320" data-fmt="comma">0</span><small>㎡</small></b></div>
              <div class="hb-track"><i class="hb-fill" data-w="74" style="--bar-c:${OR}"></i></div></div>
          </div>
        </div>` },
    /* 3 设备运行：覆盖率/OEE 卡片 + 在线/离线双环 + 在线率/离线率 */
    { title:'设备运行', accent:CY, detail:'equipment', focus:true,
      body:`
        <div class="mini-cards">
          ${miniCard(100,'%','数字化覆盖率',CY)}
          ${miniCard(82.6,'%','OEE',GR,1)}
        </div>
        <div class="ring-pair">
          <div class="ring-unit">${smallRing(98.2,CY,'162','在线')}
            <div class="ru-cap">在线率 <b>98.2%</b></div></div>
          <div class="ring-unit">${smallRing(1.8,RD,'3','离线')}
            <div class="ru-cap">离线率 <b>1.8%</b></div></div>
        </div>` },
    /* 4 质量管控：合格率双卡片 + 12 个月合格/不合格数量双轴面积曲线 */
    { title:'质量管控', accent:GR, detail:'quality', focus:true,
      body:`
        <div class="mini-cards">
          ${miniCard(96.8,'%','一次脱模合格率',GR,1)}
          ${miniCard(99.2,'%','出厂合格率',CY,1)}
        </div>
        <div class="axis-wrap">${dualAxisArea(
          [1180,1205,1190,1218,1200,1232,1225,1240,1230,1252,1248,1262],
          [26,24,27,22,25,20,19,21,18,17,16,15],GR,OR,MONTHS)}</div>` },
    /* 5 智能仓储：库存数量/使用率卡片 + 四类使用数量饼图 */
    { title:'智能仓储', accent:OR, focus:true,
      body:`
        <div class="mini-cards">
          ${miniCard(12680,'件','库存数量',OR,0,'comma')}
          ${miniCard(74.6,'%','库存使用率',CY,1)}
        </div>
        <div class="pie-row">
          ${pieChart([{l:'成品',v:4620,c:CY},{l:'半成品',v:3210,c:GR},{l:'立库',v:3150,c:BL},{l:'堆场',v:1700,c:OR}])}
          <div class="pie-legend">
            <div class="pl"><i style="background:${CY}"></i>成品<b>4,620</b></div>
            <div class="pl"><i style="background:${GR}"></i>半成品<b>3,210</b></div>
            <div class="pl"><i style="background:${BL}"></i>立库<b>3,150</b></div>
            <div class="pl"><i style="background:${OR}"></i>堆场<b>1,700</b></div>
          </div>
        </div>` },
    /* 6 智慧物流：三指标 + 配送状态分段条（替代原曲线） */
    { title:'智慧物流', accent:BL, detail:'logistics', focus:true, body:logisticsBody() },
    /* 7 绿色低碳：两列三行图标指标，单位随标签展示 */
    { title:'绿色低碳', accent:GR, focus:true, body:lowCarbonGrid() },
    /* 8 安全生产：七阶段量列表 + 半环项目总数 + 底部安全生产天数 */
    { title:'安全生产', accent:OR, focus:true, body:safetyBody() }
  ];

  function opsCard(m,i){
    const btn=m.detail?`<button class="sub detail-btn" data-detail="${m.detail}">详情</button>`:'';
    let inner;
    if(m.body){
      inner=m.body;
    }else{
      const n=m.kpis.length;
      const kp=m.kpis.map(k=>
        `<div><div class="v"><span data-count="${k.v.replace(/,/g,'')}" data-dec="${k.d||0}"
          data-fmt="${k.v.includes(',')?'comma':''}">0</span><small>${k.u}</small></div><div class="k">${k.k}</div></div>`).join('');
      inner=`<div class="kpi-pair k${n}">${kp}</div>
        <div class="lean-chart">${m.viz}</div>
        ${m.note?`<div class="lean-note">${m.note}</div>`:''}`;
    }
    return `<div class="panel card fade-up" style="--accent:${m.accent};animation-delay:${i*55}ms">
      <div class="p-head"><i class="dia"></i>${m.title}${btn}</div>
      <div class="ops-card-body${m.focus?' focus':''}">${inner}</div>
      </div>`;
  }

  /* ---- 工厂概况：平滑趋势曲线（参考图：纵轴 0-10 虚线网格 + 峰值白点高亮） ---- */
  function facTrend(data, labels, color, {w=560,h=140,max=10}={}){
    const L=28,R=10,T=10,B=24, pw=w-L-R, ph=h-T-B;
    const X=i=>L+i*pw/(data.length-1), Y=v=>T+ph-(v/max)*ph;
    const pts=data.map((v,i)=>[X(i),Y(v)]);
    // Catmull-Rom → 三次贝塞尔，得到平滑曲线
    let d=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||pts[i+1];
      const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
      const c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
      d+=` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    const grad=uid();
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="${grad}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity=".34"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
    for(let v=0;v<=max;v+=2){
      const y=Y(v);
      s+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${w-R}" y2="${y.toFixed(1)}" stroke="rgba(150,205,220,.14)" stroke-dasharray="3 4"/>`;
      s+=`<text x="${L-5}" y="${(y+3).toFixed(1)}" fill="#7FA8BF" font-size="9" text-anchor="end">${v}</text>`;
    }
    const area=`${d} L${X(data.length-1).toFixed(1)},${Y(0).toFixed(1)} L${X(0).toFixed(1)},${Y(0).toFixed(1)} Z`;
    s+=`<path d="${area}" fill="url(#${grad})" class="fade-up"/>`;
    s+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" class="line-anim" style="--len:${Math.ceil(pw*2.4)}"/>`;
    const pk=data.indexOf(Math.max(...data));
    s+=`<circle cx="${X(pk).toFixed(1)}" cy="${Y(data[pk]).toFixed(1)}" r="5.5" fill="${color}" opacity=".22"/>`;
    s+=`<circle cx="${X(pk).toFixed(1)}" cy="${Y(data[pk]).toFixed(1)}" r="3" fill="#fff" stroke="${color}" stroke-width="1.5"/>`;
    data.forEach((v,i)=>{
      s+=`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="10" fill="transparent" pointer-events="all"
        data-tip="${tipEsc(labels[i]+'：'+v+' 万kWh')}"/>`;
    });
    const step=Math.ceil(labels.length/12);
    labels.forEach((lb,i)=>{
      if(i%step===0||i===labels.length-1)
        s+=`<text x="${X(i).toFixed(1)}" y="${h-6}" fill="#7FA8BF" font-size="9" text-anchor="middle">${lb}</text>`;
    });
    return s+`</svg>`;
  }
  /* 顶部双指标条：月度累计 / 年度累计 + 环比 */
  function facEnergyTop(ic, month, year, color){
    return `<div class="fac-energy-top" style="--accent:${color}">
      <div class="fe-card">
        <div class="fe-ic">${lcIcon(ic)}</div>
        <div class="fe-meta">
          <div class="fe-l">月度累计 <em>· 万kWh</em></div>
          <div class="fe-v"><span data-count="${month.v}" data-dec="${month.dec||0}" data-fmt="${month.fmt||''}">0</span></div>
          <div class="fe-d" style="color:${month.up?RD:GR}">环比 ${month.up?'+':''}${month.d}% ${month.up?'▲':'▼'}</div>
        </div>
      </div>
      <div class="fe-card fe-noicon">
        <div class="fe-meta">
          <div class="fe-l">年度累计 <em>· 万kWh</em></div>
          <div class="fe-v"><span data-count="${year.v}" data-dec="${year.dec||0}" data-fmt="${year.fmt||''}">0</span></div>
          <div class="fe-d" style="color:${year.up?RD:GR}">同比 ${year.up?'+':''}${year.d}% ${year.up?'▲':'▼'}</div>
        </div>
      </div>
    </div>`;
  }

  /* ---- 工厂概况数据 ---- */
  const FAC_TILES = [
    {lbl:'占地面积',v:'237',u:'亩',sub:'新厂157 + 老厂80',c:CY},
    {lbl:'建筑面积',v:'18.6',u:'万 m²',sub:'生产车间及配套',c:BL},
    {lbl:'产线数量',v:'17',u:'条',sub:'新厂11 + 老厂构件6',c:GR},
    {lbl:'订单量',v:'186',u:'个',sub:'执行48 · 完成138',c:OR}
  ];
  const factoryHTML = () => `
    <div class="fac-hero">${FAC_TILES.map((t,i)=>`
      <div class="fac-tile fade-up" style="--accent:${t.c};animation-delay:${i*60}ms">
        <div class="t-lbl">${t.lbl}</div>
        <div class="t-val"><span data-count="${t.v}" data-dec="${t.v.includes('.')?1:0}"
          data-fmt="${t.v.includes(',')?'comma':''}">0</span><small>${t.u}</small></div>
        <div class="t-sub">${t.sub}</div>
      </div>`).join('')}</div>
    <div class="fac-grid">
      <div class="panel card fac-panel fac-people fade-up" style="--accent:${BL};animation-delay:240ms">
        <div class="p-head"><i class="dia"></i>工厂人数</div>
        <div class="card-body">
          <div class="kpi-pair k3">
            <div><div class="v"><span data-count="88">0</span><small>人</small></div><div class="k">新厂人数</div></div>
            <div><div class="v"><span data-count="40">0</span><small>人</small></div><div class="k">老厂人数</div></div>
          </div>
          <div class="viz-row" style="align-items:center;justify-content:center;gap:24px">
            ${donut(29.7,CY,'128','员工总数',128)}
            <div style="font-size:13px;color:var(--text-secondary);line-height:2.4;white-space:nowrap">
              <div><i style="display:inline-block;width:8px;height:8px;background:${CY};border-radius:2px;margin-right:6px"></i>管理 <b style="color:${CY};font-size:15px">38</b> 人</div>
              <div><i style="display:inline-block;width:8px;height:8px;background:${BL};border-radius:2px;margin-right:6px"></i>工人 <b style="color:${BL};font-size:15px">90</b> 人</div>
            </div>
          </div>
        </div></div>
      <div class="panel card fac-panel fade-up" style="--accent:${CY};animation-delay:300ms">
        <div class="p-head"><i class="dia"></i>用电量</div>
        <div class="card-body">
          ${facEnergyTop('electric',
            {v:'118.16',dec:2,d:'5.8',up:true},
            {v:'1416.32',dec:2,d:'8.6',up:true}, CY)}
          <div class="fac-trend-head">月度用电趋势</div>
          <div class="fac-trend-chart">${facTrend([2.1,3.6,9.2,6.4,4.1,2.8],MONTHS.slice(0,6),CY)}</div>
        </div></div>
      <div class="panel card fac-panel fade-up" style="--accent:${GR};animation-delay:360ms">
        <div class="p-head"><i class="dia"></i>发电量</div>
        <div class="card-body">
          ${facEnergyTop('solar',
            {v:'13.5',dec:1,d:'12.4',up:true},
            {v:'1410',d:'6.8',up:true}, GR)}
          <div class="fac-trend-head">月度发电趋势</div>
          <div class="fac-trend-chart">${facTrend([2.2,3.0,4.6,6.8,8.6,9.8,9.2,7.8,6.2,4.8,3.4,2.6],MONTHS,GR)}</div>
        </div></div>
      <div class="panel card fac-panel fade-up" style="--accent:${OR};animation-delay:420ms">
        <div class="p-head"><i class="dia"></i>客户满意度</div>
        <div class="card-body">
          <div class="fac-sat">
            <div class="fs-ring">${donut(98.6,OR,'98.6%','综合满意度',122)}</div>
            <div class="fs-lv">
              <div class="fs-row"><span class="fs-nm">很满意</span><div class="fs-track"><i class="fs-fill" style="background:${GR};width:86.2%"></i></div><span class="fs-val" style="color:${GR}">86.2%</span></div>
              <div class="fs-row"><span class="fs-nm">满意</span><div class="fs-track"><i class="fs-fill" style="background:${CY};width:12.4%"></i></div><span class="fs-val" style="color:${CY}">12.4%</span></div>
              <div class="fs-row"><span class="fs-nm">待改进</span><div class="fs-track"><i class="fs-fill" style="background:${OR};width:1.4%"></i></div><span class="fs-val" style="color:${OR}">1.4%</span></div>
              <div class="fs-stars">★★★★★ <span style="margin-left:6px">年度调研 NPS 82 · 较去年 <b style="color:${GR}">+3.2</b></span></div>
            </div>
          </div>
        </div></div>
    </div>`;

  /* ---- 详情通用柱状图：分组双柱 / 多系列堆叠，12 月横轴 + 数量纵轴 ---- */
  function detailBars(cats, series, colors, labels, {h=210,w=560,mode='grouped'}={}){
    const L=44,R=12,T=28,B=30, plotW=w-L-R, plotH=h-T-B;
    const totals=cats.map((_,i)=> mode==='stacked'
      ? series.reduce((a,s)=>a+(s[i]||0),0)
      : Math.max(...series.map(s=>s[i]||0)));
    const max=Math.max(...totals,1)*1.12;
    let s='';
    for(let i=0;i<=4;i++){
      const y=T+plotH-plotH*i/4;
      s+=`<line x1="${L}" y1="${y.toFixed(1)}" x2="${w-R}" y2="${y.toFixed(1)}" stroke="rgba(150,205,220,.14)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-4}" y="${(y+3).toFixed(1)}" fill="#7FA8BF" font-size="9" text-anchor="end">${Math.round(max*i/4).toLocaleString()}</text>`;
    }
    const slot=plotW/cats.length;
    cats.forEach((cat,ci)=>{
      if(mode==='stacked'){
        let acc=0;
        series.forEach((data,si)=>{
          const v=data[ci]||0, bh=v/max*plotH, y=T+plotH-acc-bh;
          acc+=bh;
          s+=`<rect class="bar-anim" x="${(L+ci*slot+slot*.22).toFixed(1)}" y="${y.toFixed(1)}" width="${(slot*.56).toFixed(1)}" height="${Math.max(0,bh).toFixed(1)}" fill="${colors[si]}" style="animation-delay:${ci*30+si*20}ms"
            data-tip="${tipEsc(cat+' · '+(labels[si]||('系列'+(si+1)))+'：'+v)}"/>`;
        });
      }else{
        const n=series.length, bw=Math.min(slot*.3,16), gap=2, gw=bw*n+gap*(n-1);
        series.forEach((data,si)=>{
          const v=data[ci]||0, bh=v/max*plotH;
          const x=L+ci*slot+(slot-gw)/2+si*(bw+gap);
          s+=`<rect class="bar-anim" x="${x.toFixed(1)}" y="${(T+plotH-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0,bh).toFixed(1)}" fill="${colors[si]}" style="animation-delay:${ci*30+si*20}ms"
            data-tip="${tipEsc(cat+' · '+(labels[si]||('系列'+(si+1)))+'：'+v)}"/>`;
        });
      }
      s+=`<text x="${(L+ci*slot+slot/2).toFixed(1)}" y="${h-10}" fill="#7FA8BF" font-size="9" text-anchor="middle">${cat}</text>`;
    });
    labels.forEach((lb,i)=>{
      const x=L+i*Math.min(plotW/labels.length,110);
      s+=`<rect x="${x.toFixed(1)}" y="7" width="7" height="7" fill="${colors[i]}"/>`;
      s+=`<text x="${(x+10).toFixed(1)}" y="14" fill="#BFD4E2" font-size="9">${lb}</text>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${s}</svg>`;
  }

  /* 详情：精确绘制的环形饼图（避免 dash 偏移带来的尾部错位） */
  function pieDonut(pct,color,num,label=''){
    const cx=50,cy=50,r=38;
    const a0=-90,a1=-90+360*pct/100;
    const pt=a=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)];
    const p0=pt(a0),p1=pt(a1),large=pct>50?1:0;
    const d='M'+p0[0].toFixed(1)+' '+p0[1].toFixed(1)+' A'+r+' '+r+' 0 '+large+' 1 '+p1[0].toFixed(1)+' '+p1[1].toFixed(1);
    return `<svg viewBox="0 0 100 100" width="96" height="96" preserveAspectRatio="xMidYMid meet">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(150,205,220,.16)" stroke-width="9"/>
      <path class="donut-anim" d="${d}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="butt"
        data-tip="${tipEsc((label||'占比')+'：'+num)}"/>
      <circle cx="${cx}" cy="${cy}" r="${r-9}" fill="none" stroke="${color}" stroke-opacity=".12" stroke-width="1"/>
      <text x="50" y="55" fill="${color}" font-size="20" font-weight="700" text-anchor="middle">${num}</text>
    </svg>`;
  }
  /* 详情：构件 / 混凝土模块 双饼图 */
  function piePair(){
    return `<div class="pie-pair">
      <div class="pp-unit fade-up">
        <div class="pp-name">构件</div>
        ${pieDonut(66.9,CY,'66.9%','构件')}
        <div class="pp-val">8,600 m³</div>
      </div>
      <div class="pp-unit fade-up" style="animation-delay:90ms">
        <div class="pp-name">混凝土模块</div>
        ${pieDonut(33.1,OR,'33.1%','混凝土模块')}
        <div class="pp-val">4,260 m³</div>
      </div>
    </div>`;
  }

  /* 详情：综合生产关键指标（图标 + 数值 + 单位） */
  function keyMetricsGrid(){
    const items=[
      {ic:'design',v:'14900',fmt:'comma',u:'m³',l:'全年设计产能'},
      {ic:'output',v:'12860',fmt:'comma',u:'m³',l:'年度生产量'},
      {ic:'util',v:'86.4',dec:1,u:'%',l:'产能利用率'},
      {ic:'oee',v:'82.6',dec:1,u:'%',l:'OEE'},
      {ic:'days',v:'96',u:'天',l:'无故障运行天数'}
    ];
    return `<div class="km-grid">${items.map((it,i)=>`
      <div class="lc-item fade-up${i===4?' km-wide':''}" style="animation-delay:${i*45}ms;--accent:${[CY,BL,GR,OR,'#7FA8BF'][i]}"
        data-tip="${tipEsc(it.l+'：'+it.v+' '+it.u)}">
        <div class="lc-icon">${lcIcon(it.ic)}</div>
        <div class="lc-data">
          <div class="lc-v"><span data-count="${it.v}" data-dec="${it.dec||0}" data-fmt="${it.fmt||''}">0</span><small>${it.u}</small></div>
          <div class="lc-l">${it.l}</div>
        </div>
      </div>`).join('')}</div>`;
  }
  /* 详情：项目数量 / 在项目数量 / 混凝土模块项目需求量 / 构件需求量 */
  function projectDemand(){
    const items=[
      {ic:'design',v:'48',fmt:'',u:'个',l:'项目数量',s:'本年累计项目',c:CY},
      {ic:'util',v:'22',fmt:'',u:'个',l:'项目在执行数量',s:'执行率 45.8%',c:BL},
      {ic:'output',v:'18320',fmt:'comma',u:'m²',l:'混凝土模块项目需求量',s:'占需求 42.7%',c:GR},
      {ic:'pieces',v:'24600',fmt:'comma',u:'m³',l:'构件需求量',s:'占需求 57.3%',c:OR}
    ];
    return `<div class="pd-grid">${items.map((it,i)=>`
      <div class="pd-item fade-up" style="animation-delay:${i*55}ms;--accent:${it.c}"
        data-tip="${tipEsc(it.l+'：'+it.v+' '+it.u+' · '+it.s)}">
        <div class="pd-ic">${lcIcon(it.ic)}</div>
        <div class="pd-data">
          <div class="pd-v"><span data-count="${it.v}" data-fmt="${it.fmt}">0</span><small>${it.u}</small></div>
          <div class="pd-l">${it.l}</div>
          <div class="pd-s">${it.s}</div>
        </div>
      </div>`).join('')}</div>`;
  }
  /* 详情：产能利用率漏斗（设计产能 → 生产量 → 合格产量 → 综合利用率） */
  function funnelChart(){
    const stages=[
      {l:'设计产能',v:14900,c:BL},
      {l:'生产量',v:12860,c:CY},
      {l:'合格产量',v:12430,c:GR}
    ];
    const widths=[172,136,100], cx=100, y0=12, hh=36, gap=8;
    let s='<text x="14" y="8" fill="#7FA8BF" font-size="8">单位：m³</text>';
    stages.forEach((st,i)=>{
      const y=y0+i*(hh+gap), w1=widths[i], w2=i<2?widths[i+1]:widths[i]-16;
      s+=`<path class="fade-up" d="M${cx-w1/2} ${y} L${cx+w1/2} ${y} L${cx+w2/2} ${y+hh} L${cx-w2/2} ${y+hh} Z"
        fill="${st.c}" fill-opacity=".55" stroke="${st.c}" stroke-width="1.2" style="animation-delay:${i*60}ms"
        data-tip="${tipEsc(st.l+'：'+st.v.toLocaleString()+' m³')}"/>`;
      s+=`<text x="${cx}" y="${y+16}" fill="#EAF6FF" font-size="10" text-anchor="middle">${st.l}</text>`;
      s+=`<text x="${cx}" y="${y+29}" fill="#EAF6FF" font-size="11" font-weight="700" text-anchor="middle">${st.v.toLocaleString()}</text>`;
      if(i<2){
        const rate=(stages[i+1].v/st.v*100).toFixed(1);
        s+=`<text x="228" y="${y+hh+gap/2+3}" fill="#BFD4E2" font-size="9" text-anchor="end">↓ ${rate}%</text>`;
      }
    });
    s+=`<text x="${cx}" y="164" fill="${CY}" font-size="10" text-anchor="middle">综合利用率 86.4%</text>`;
    s+=`<text x="${cx}" y="181" fill="#7FA8BF" font-size="9" text-anchor="middle">生产量 ÷ 设计产能</text>`;
    return `<svg viewBox="0 0 236 200" preserveAspectRatio="xMidYMid meet">${s}</svg>`;
  }

  /* ===== 设备运行详情专用图表（尽量不复用其他弹窗图表形式） ===== */
  function ringArc(cx,cy,r,w,a0,a1){
    const ro=r+w/2,ri=r-w/2;
    const p=(rad,a)=>[cx+rad*Math.cos(a*Math.PI/180),cy+rad*Math.sin(a*Math.PI/180)];
    const o0=p(ro,a0),o1=p(ro,a1),i1=p(ri,a1),i0=p(ri,a0),lg=(a1-a0)>180?1:0;
    return `M${o0[0].toFixed(1)} ${o0[1].toFixed(1)} A${ro} ${ro} 0 ${lg} 1 ${o1[0].toFixed(1)} ${o1[1].toFixed(1)} `+
      `L${i1[0].toFixed(1)} ${i1[1].toFixed(1)} A${ri} ${ri} 0 ${lg} 0 ${i0[0].toFixed(1)} ${i0[1].toFixed(1)} Z`;
  }
  /* 1. 设备在线率：六状态环形 + 外部标签 + 数量/占比图例 */
  function deviceStatusDonut(){
    const items=[
      {l:'运行',v:82,c:CY},{l:'维修',v:18,c:BL},{l:'待机',v:46,c:'#2B6FA3'},
      {l:'故障',v:12,c:'#8FC4E8'},{l:'离线',v:3,c:OR},{l:'未知',v:4,c:GR}
    ];
    const total=items.reduce((a,b)=>a+b.v,0),cx=140,cy=96,r=57,w=24;
    let acc=0,s=`<svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet">`;
    s+=`<text x="18" y="20" fill="#7FA8BF" font-size="10">设备日状态分布</text>`;
    s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(150,205,220,.12)" stroke-width="${w}"/>`;
    items.forEach((it,i)=>{
      const a0=-90+acc/total*360,a1=-90+(acc+it.v)/total*360,mid=(a0+a1)/2;
      if(it.v>0) s+=`<path d="${ringArc(cx,cy,r,w,a0,a1)}" fill="${it.c}" opacity=".92" class="fade-up" style="animation-delay:${i*45}ms"
        data-tip="${tipEsc(it.l+'：'+it.v+' 台 · '+(it.v/total*100).toFixed(1)+'%')}"/>`;
      const rad=mid*Math.PI/180,co=Math.cos(rad),si=Math.sin(rad);
      const lx=cx+88*co,ly=cy+88*si+(si>.6?6:si<-.6?-2:4);
      const anchor=co>.25?'start':co<-.25?'end':'middle';
      s+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#BFD4E2" font-size="10" text-anchor="${anchor}">${it.l} ${it.v}</text>`;
      acc+=it.v;
    });
    s+=`<text x="${cx}" y="${cy-2}" fill="${CY}" font-size="26" font-weight="700" text-anchor="middle">98.2%</text>`;
    s+=`<text x="${cx}" y="${cy+18}" fill="#7FA8BF" font-size="10" text-anchor="middle">在线 162 / 在册 165</text>`;
    s+=`<text x="300" y="20" fill="#7FA8BF" font-size="10">状态明细 · 数量 / 占比</text>`;
    items.forEach((it,i)=>{
      const yy=47+i*24,pct=it.v/total*100;
      s+=`<rect x="300" y="${yy-9}" width="10" height="10" fill="${it.c}"/>`;
      s+=`<text x="318" y="${yy}" fill="#BFD4E2" font-size="11">${it.l}</text>`;
      s+=`<text x="398" y="${yy}" fill="#EAF6FF" font-size="11" font-weight="600" text-anchor="end">${it.v} 台</text>`;
      s+=`<text x="500" y="${yy}" fill="${it.c}" font-size="10" text-anchor="end">${pct.toFixed(1)}%</text>`;
      s+=`<rect x="300" y="${yy+5}" width="200" height="3" rx="1.5" fill="rgba(150,205,220,.12)"/>`;
      s+=`<rect x="300" y="${yy+5}" width="${(pct/100*200).toFixed(1)}" height="3" rx="1.5" fill="${it.c}"/>`;
    });
    return s+`</svg>`;
  }
  /* 2. 综合运行时长：设备类别时长分布环形 + 中心信息卡 */
  function runtimeDonut(){
    const items=[
      {l:'钢筋加工',v:1180,c:'#4E86CF'},{l:'焊接',v:620,c:'#7FB4E3'},
      {l:'布料',v:540,c:'#2B6FA3'},{l:'振捣',v:480,c:'#8FC4E8'},
      {l:'蒸养',v:760,c:OR},{l:'清洗',v:420,c:GR},{l:'码垛',v:360,c:'#7FA8BF'},
      {l:'输送',v:900,c:BL},{l:'动力',v:420,c:'#5B9BD5'}
    ];
    const total=items.reduce((a,b)=>a+b.v,0),cx=140,cy=96,r=55,w=23;
    let acc=0,s=`<svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet">`;
    s+=`<text x="18" y="20" fill="#7FA8BF" font-size="10">按设备类别累计</text>`;
    s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(150,205,220,.12)" stroke-width="${w}"/>`;
    items.forEach((it,i)=>{
      const a0=-90+acc/total*360,a1=-90+(acc+it.v)/total*360,mid=(a0+a1)/2;
      s+=`<path d="${ringArc(cx,cy,r,w,a0,a1)}" fill="${it.c}" opacity=".92" class="fade-up" style="animation-delay:${i*40}ms"
        data-tip="${tipEsc(it.l+'：'+it.v.toLocaleString()+' h · '+(it.v/total*100).toFixed(1)+'%')}"/>`;
      const rad=mid*Math.PI/180,co=Math.cos(rad),si=Math.sin(rad);
      const lx=cx+86*co,ly=cy+86*si+(si>.6?6:si<-.6?-2:4);
      const anchor=co>.25?'start':co<-.25?'end':'middle';
      s+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#BFD4E2" font-size="9.5" text-anchor="${anchor}">${it.l} ${it.v}h</text>`;
      acc+=it.v;
    });
    s+=`<rect x="100" y="78" width="80" height="38" rx="5" fill="#123B5D" stroke="${CY}" stroke-opacity=".7"/>`;
    s+=`<circle cx="112" cy="90" r="3" fill="${CY}"/>`;
    s+=`<text x="120" y="93" fill="#BFD4E2" font-size="9">总运行时长</text>`;
    s+=`<text x="140" y="109" fill="${CY}" font-size="16" font-weight="700" text-anchor="middle">5,680h</text>`;
    s+=`<text x="300" y="20" fill="#7FA8BF" font-size="10">类别时长排行 · h</text>`;
    items.forEach((it,i)=>{
      const yy=44+i*15;
      s+=`<rect x="300" y="${yy-8}" width="8" height="8" fill="${it.c}"/>`;
      s+=`<text x="316" y="${yy}" fill="#BFD4E2" font-size="9.5">${it.l}</text>`;
      s+=`<rect x="380" y="${yy-7}" width="82" height="5" rx="2" fill="rgba(150,205,220,.12)"/>`;
      s+=`<rect x="380" y="${yy-7}" width="${(it.v/1180*82).toFixed(1)}" height="5" rx="2" fill="${it.c}" opacity=".9"/>`;
      s+=`<text x="500" y="${yy}" fill="#EAF6FF" font-size="9.5" font-weight="600" text-anchor="end">${it.v.toLocaleString()}</text>`;
    });
    return s+`</svg>`;
  }
  /* 3. OEE 趋势：12 月棒棒糖图 + 目标线 + 丰富指标 */
  function oeeTrendCombo(){
    const data=[78.2,79.6,80.4,79.8,81.6,82.3,81.9,83.5,82.8,84.1,83.7,82.6],target=80;
    const L=36,R=498,T=48,B=156,min=76,max=86;
    const x=i=>L+i*(R-L)/(data.length-1),y=v=>B-(v-min)/(max-min)*(B-T);
    let s=`<svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet">`;
    const kpis=[['当前','82.6%',CY],['目标','80.0%',OR],['同比','+3.2pt',GR],['达标','8 / 12',BL]];
    kpis.forEach((k,i)=>{
      const xk=12+i*126;
      s+=`<text x="${xk}" y="14" fill="#7FA8BF" font-size="10">${k[0]}</text>`;
      s+=`<text x="${xk}" y="32" fill="${k[2]}" font-size="15" font-weight="700">${k[1]}</text>`;
    });
    [76,80,84,86].forEach(v=>{
      const yy=y(v);
      s+=`<line x1="${L}" y1="${yy.toFixed(1)}" x2="${R}" y2="${yy.toFixed(1)}" stroke="rgba(150,205,220,.14)" stroke-dasharray="3 3"/>`;
      s+=`<text x="${L-5}" y="${(yy+4).toFixed(1)}" fill="#7FA8BF" font-size="9" text-anchor="end">${v}</text>`;
    });
    s+=`<line x1="${L}" y1="${y(target).toFixed(1)}" x2="${R}" y2="${y(target).toFixed(1)}" stroke="${OR}" stroke-width="1.3" stroke-dasharray="6 4"/>`;
    s+=`<text x="${R}" y="${(y(target)-6).toFixed(1)}" fill="${OR}" font-size="9" text-anchor="end">目标 80%</text>`;
    let pts='';
    data.forEach((v,i)=>{
      const px=x(i),py=y(v),c=v>=target?GR:OR;
      s+=`<line x1="${px.toFixed(1)}" y1="${B}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="${c}" stroke-opacity=".5" stroke-width="3"/>`;
      s+=`<circle class="fade-up" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.4" fill="${c}" style="animation-delay:${i*35}ms"/>`;
      s+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="9" fill="transparent" pointer-events="all"
        data-tip="${tipEsc(MONTHS[i]+'：OEE '+v+'%')}"/>`;
      pts+=`${px.toFixed(1)},${py.toFixed(1)} `;
      if(i%2===0) s+=`<text x="${px.toFixed(1)}" y="${B+15}" fill="#7FA8BF" font-size="9" text-anchor="middle">${MONTHS[i]}</text>`;
    });
    s+=`<polyline points="${pts.trim()}" fill="none" stroke="${CY}" stroke-opacity=".75" stroke-width="1.8"/>`;
    s+=`<rect x="12" y="180" width="220" height="14" rx="7" fill="rgba(62,134,180,.16)"/>`;
    s+=`<text x="20" y="190.5" fill="#BFD4E2" font-size="10">峰值 84.1%（10月）</text>`;
    s+=`<rect x="270" y="180" width="238" height="14" rx="7" fill="rgba(240,183,90,.12)"/>`;
    s+=`<text x="278" y="190.5" fill="${OR}" font-size="10">低于目标 3 个月 · 均值 81.7%</text>`;
    return s+`</svg>`;
  }
  /* 4. 无故障运行天数：类别子弹图 + 目标刻度 */
  function faultFreeBullet(){
    const rows=[
      {l:'动力',v:124,t:90},{l:'输送',v:108,t:90},{l:'钢筋加工',v:96,t:90},
      {l:'焊接',v:72,t:90},{l:'蒸养',v:64,t:90},{l:'清洗',v:56,t:70},
      {l:'码垛',v:48,t:70},{l:'布料',v:42,t:70},{l:'振捣',v:36,t:70}
    ];
    const x0=118,x1=452,max=140;
    let s=`<svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet">`;
    [['最长','124 天',GR],['均值','70 天',CY],['最短','36 天',OR]].forEach((k,i)=>{
      const x=12+i*170;
      s+=`<rect x="${x}" y="5" width="155" height="24" rx="4" fill="rgba(62,134,180,.12)"/>`;
      s+=`<text x="${x+8}" y="15" fill="#7FA8BF" font-size="9">${k[0]}</text>`;
      s+=`<text x="${x+8}" y="28" fill="${k[2]}" font-size="13" font-weight="700">${k[1]}</text>`;
    });
    rows.forEach((r,i)=>{
      const yy=47+i*14,c=r.v>=r.t?GR:OR;
      s+=`<text x="${x0-8}" y="${yy+4}" fill="#BFD4E2" font-size="10" text-anchor="end">${r.l}</text>`;
      s+=`<rect x="${x0}" y="${yy-6}" width="${x1-x0}" height="9" rx="4" fill="rgba(150,205,220,.12)"/>`;
      s+=`<rect class="meter-anim" x="${x0}" y="${yy-6}" width="${(r.v/max*(x1-x0)).toFixed(1)}" height="9" rx="4" fill="${c}" opacity=".85"
        data-tip="${tipEsc(r.l+'：'+r.v+' 天 · 目标 '+r.t+' 天')}"/>`;
      const tx=x0+r.t/max*(x1-x0);
      s+=`<line x1="${tx.toFixed(1)}" y1="${yy-9}" x2="${tx.toFixed(1)}" y2="${yy+9}" stroke="#EAF6FF" stroke-width="1.2"/>`;
      s+=`<text x="${x1+8}" y="${yy+4}" fill="${c}" font-size="10" font-weight="600">${r.v}天</text>`;
    });
    s+=`<line x1="${x0}" y1="181" x2="${x1}" y2="181" stroke="rgba(150,205,220,.35)"/>`;
    [0,70,140].forEach(v=>{
      const xx=x0+v/max*(x1-x0);
      s+=`<text x="${xx.toFixed(1)}" y="194" fill="#7FA8BF" font-size="9" text-anchor="middle">${v}</text>`;
    });
    s+=`<text x="508" y="194" fill="#7FA8BF" font-size="9" text-anchor="end">天 · 白线为目标</text>`;
    return s+`</svg>`;
  }
  /* 5. OEE 分组：构件 / 混凝土模块 对称蝴蝶条形图 + 维度对比 */
  function oeeGroupTornado(){
    const dims=[
      {l:'时间开动',pc:90.2,mic:92.1},{l:'性能开动',pc:87.4,mic:89.6},
      {l:'质量合格',pc:98.1,mic:98.6},{l:'综合 OEE',pc:81.4,mic:84.1}
    ];
    const cx=260,half=188;
    let s=`<svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet">`;
    s+=`<text x="12" y="18" fill="${BL}" font-size="11">■ 构件 81.4%</text>`;
    s+=`<text x="190" y="18" fill="${CY}" font-size="11">■ 混凝土模块 84.1%</text>`;
    s+=`<text x="380" y="18" fill="${GR}" font-size="11">差距 +2.7pt</text>`;
    s+=`<line x1="${cx}" y1="30" x2="${cx}" y2="176" stroke="rgba(150,205,220,.3)"/>`;
    dims.forEach((d,i)=>{
      const yy=52+i*32,lw=d.pc/100*half,rw=d.mic/100*half;
      s+=`<text x="${cx}" y="${yy-11}" fill="#BFD4E2" font-size="11" text-anchor="middle">${d.l}</text>`;
      s+=`<rect class="meter-anim" x="${(cx-lw).toFixed(1)}" y="${yy}" width="${lw.toFixed(1)}" height="12" rx="2" fill="${BL}" opacity=".9"
        data-tip="${tipEsc(d.l+' · 构件：'+d.pc+'%')}"/>`;
      s+=`<rect class="meter-anim" x="${cx}" y="${yy}" width="${rw.toFixed(1)}" height="12" rx="2" fill="${CY}" opacity=".9"
        data-tip="${tipEsc(d.l+' · 混凝土模块：'+d.mic+'%')}"/>`;
      s+=`<text x="${(cx-lw-6).toFixed(1)}" y="${yy+10}" fill="${BL}" font-size="11" text-anchor="end">${d.pc}%</text>`;
      s+=`<text x="${(cx+rw+6).toFixed(1)}" y="${yy+10}" fill="${CY}" font-size="11">${d.mic}%</text>`;
      s+=`<text x="${cx}" y="${yy+10}" fill="${(d.mic-d.pc)>=3?GR:'#7FA8BF'}" font-size="9" text-anchor="middle">+${(d.mic-d.pc).toFixed(1)}</text>`;
    });
    s+=`<rect x="12" y="182" width="496" height="13" rx="6" fill="rgba(79,214,155,.10)"/>`;
    s+=`<text x="20" y="192" fill="${GR}" font-size="10">优势项：性能开动 +2.2pt · 时间开动 +1.9pt · 质量合格 +0.5pt</text>`;
    return s+`</svg>`;
  }
  /* 6. 指标达成率 → 设备计划内运行时长：横向分段条 + 悬浮卡 */
  function plannedRuntimeBars(){
    const rows=[
      ['EQ-GJ-001',6,1.5,0,0,.5],['EQ-HJ-002',3,1,3,1,0],['EQ-GJ-003',6,1,0,0,0],
      ['EQ-BT-004',6,2,0,0,0],['EQ-ZD-005',2,1,4,0,0],['EQ-YZ-006',5,.5,.5,1,1],
      ['EQ-MT-007',6,0,0,0,0],['EQ-MD-008',0,0,0,0,0],['EQ-SC-009',6,0,0,0,0],
      ['EQ-SC-010',0,0,0,0,0],['EQ-DL-011',6,0,0,0,0],['EQ-DL-012',6,0,0,0,0]
    ];
    const colors=[GR,OR,RD,BL,'#7FA8BF'],labels=['运行','待机','故障','维修','离线'];
    const x0=108,x1=470,scale=(x1-x0)/24,y0=37,rh=12;
    let s=`<svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet">`;
    labels.forEach((l,i)=>{
      const lx=110+i*82;
      s+=`<rect x="${lx}" y="7" width="8" height="8" fill="${colors[i]}"/>`;
      s+=`<text x="${lx+11}" y="14" fill="#BFD4E2" font-size="9">${l}</text>`;
    });
    [0,6,12,18,24].forEach(v=>{
      const gx=x0+v*scale;
      s+=`<line x1="${gx.toFixed(1)}" y1="26" x2="${gx.toFixed(1)}" y2="174" stroke="rgba(150,205,220,.12)" stroke-dasharray="2 3"/>`;
      s+=`<text x="${gx.toFixed(1)}" y="184" fill="#7FA8BF" font-size="9" text-anchor="middle">${v}</text>`;
    });
    rows.forEach((r,i)=>{
      const yy=y0+i*rh;
      if(i===4) s+=`<rect x="6" y="${yy-8}" width="508" height="12" rx="2" fill="rgba(111,220,234,.10)"/>`;
      s+=`<text x="${x0-8}" y="${yy+4}" fill="#BFD4E2" font-size="9" text-anchor="end">${r[0]}</text>`;
      let acc=0;
      r.slice(1).forEach((v,k)=>{
        if(v>0){
          const bx=x0+acc*scale,bw=v*scale;
          s+=`<rect x="${bx.toFixed(1)}" y="${yy-6}" width="${bw.toFixed(1)}" height="9" fill="${colors[k]}" opacity=".92"
            data-tip="${tipEsc(r[0]+' · '+labels[k]+'：'+v+' h')}"/>`;
        }
        acc+=v;
      });
    });
    s+=`<rect x="300" y="104" width="204" height="76" rx="5" fill="#123B5D" fill-opacity=".96" stroke="${CY}" stroke-opacity=".6"/>`;
    s+=`<text x="310" y="120" fill="#EAF6FF" font-size="12" font-weight="700">EQ-ZD-005</text>`;
    labels.forEach((l,i)=>{
      const vy=136+i*10;
      s+=`<circle cx="315" cy="${vy-3}" r="2.8" fill="${colors[i]}"/>`;
      s+=`<text x="324" y="${vy}" fill="#BFD4E2" font-size="9.5">${l}</text>`;
      s+=`<text x="494" y="${vy}" fill="#EAF6FF" font-size="10" font-weight="600" text-anchor="end">${rows[4][i+1]}</text>`;
    });
    s+=`<text x="508" y="194" fill="#7FA8BF" font-size="9" text-anchor="end">单位：h · 计划时长 24h</text>`;
    return s+`</svg>`;
  }

  /* ---- 结构化详情数据 ---- */
  const DETAIL = {
    capacity:{title:'工厂产能详情',sub:'设计产能 vs 生产量 · 利用率 · 项目需求',
      kpis:[
        {l:'生产量 / 设计产能',v:'12,860',u:'m³',s:'构件 8,600 · 混凝土模块 4,260',c:CY},
        {l:'产能利用率',v:'86.4',u:'%',s:'生产量 ÷ 设计产能',c:GR},
        {l:'全部工单',v:'50',u:'张',s:'待接单12 · 异常28',c:BL},
        {l:'综合效率 OEE',v:'82.6',u:'%',s:'开动×性能×合格',c:OR}],
      charts:[
        {h:'设计产能 vs 生产量',t:'bars2',d:{cats:MONTHS,
          series:[[1050,1080,1110,1140,1170,1200,1230,1260,1290,1320,1350,1380],
                  [908,934,959,985,1011,1037,1063,1089,1115,1140,1166,1192]],
          colors:[BL,CY],labels:['设计产能','生产量'],mode:'grouped'}},
        {h:'全年产量',t:'bars2',d:{
          cats:['混凝土模块','模块组件','构件'],
          series:[[6,4,2],[0,0,0],[3,1,1],[2,2,1],[7,9,12]],
          colors:[BL,'#7FA8BF',CY,GR,RD],
          labels:['待接单','待生产','生产中','已完成','异常'],mode:'stacked'}},
        {h:'产能结构占比',t:'piePair'},
        {h:'产能利用率',t:'funnel'},
        {h:'项目数量 / 需求量',t:'projectDemand'},
        {h:'综合生产关键指标',t:'kmGrid'}]},
    equipment:{title:'设备运行详情',sub:'在线状态 · 运行时长 · OEE · 无故障天数',
      kpis:[
        {l:'设备在线率',v:'98.2',u:'%',s:'在线 162 ÷ 在册 165',c:CY},
        {l:'综合运行时长',v:'5,680',u:'h',s:'9 类设备累计',c:BL},
        {l:'无故障运行天数',v:'96',u:'天',s:'连续无故障',c:GR},
        {l:'设备综合效率 OEE',v:'82.6',u:'%',s:'开动×性能×合格',c:OR}],
      charts:[
        {h:'设备在线率',t:'deviceStatus'},
        {h:'综合运行时长',t:'runtimeDonut'},
        {h:'OEE 趋势（%）',t:'oeeTrend'},
        {h:'无故障运行天数',t:'faultFree'},
        {h:'OEE 分组',t:'oeeGroup'},
        {h:'设备计划内运行时长',t:'plannedRuntime'}]},
    quality:{title:'质量管控详情',sub:'合格率 · 待复检 · 生产经营 · 交付',
      kpis:[
        {l:'一次检验合格率',v:'96.8',u:'%',s:'不含复检合格品',c:CY},
        {l:'待复检产品',v:'42',u:'件',s:'隔离 / 复检后隔离',c:OR},
        {l:'整体合格率',v:'99.1',u:'%',s:'一次+复检 ÷ 总数',c:GR},
        {l:'交付完成率',v:'94.6',u:'%',s:'按周统计',c:BL}],
      charts:[
        {h:'一次 / 整体合格率',n:'双饼图',t:'qaPassPies'},
        {h:'待复检分析',n:'物料分类 × 状态',t:'qaRecheck'},
        {h:'合格率趋势',n:'物料分类 · 件',t:'qaPassTrend'},
        {h:'生产经营',n:'成品 / 物料 · 万元',t:'qaOperation'},
        {h:'交付趋势',n:'本年12月 · 物料分类',t:'qaDelivery'},
        {h:'质量明细',n:'本期汇总',t:'qaDetailGrid'}]},
    logistics:{title:'物流调度详情',sub:'计划执行 · 签收 · 库位齐套 · 在途趋势',
      kpis:[
        {l:'配送准时率',v:'96.4',u:'%',s:'准时单数 ÷ 总单数',c:CY},
        {l:'配送计划执行率',v:'92.8',u:'%',s:'已配送 ÷ 计划配送',c:BL},
        {l:'库位占用率',v:'74.6',u:'%',s:'占用 ÷ 总库位',c:GR},
        {l:'齐套工单率',v:'88.5',u:'%',s:'齐套 ÷ 工单总数',c:OR},
        {l:'执行项目数',v:'48',u:'个',s:'在执行配送项目',c:CY},
        {l:'交付量',v:'1,240',u:'件',s:'本期累计交付',c:BL}],
      charts:[
        {h:'配送计划 vs 已配送',n:'本年12个月 · 单',t:'lgPlanDeliver'},
        {h:'配送计划执行',n:'本年12个月 · 状态数量',t:'lgPlanStatus'},
        {h:'准时率 + 执行率',n:'签收数量 · 单',t:'lgRateSign'},
        {h:'库位齐套执行',n:'库位占用 / 齐套下钻',t:'lgStorageKit'},
        {h:'在途配送趋势',n:'本年12个月 · 状态',t:'lgTransitTrend'},
        {h:'物流明细',n:'本期汇总',t:'lgLogisticsDetail'}]}
  };

  function detailChartHTML(c,i){
    let body='';
    if(c.t==='grouped') body=groupedBars(c.d,c.cs,{labels:c.lb});
    else if(c.t==='bars2') body=detailBars(c.d.cats,c.d.series,c.d.colors,c.d.labels,{mode:c.d.mode});
    else if(c.t==='piePair') body=piePair();
    else if(c.t==='projectDemand') body=projectDemand();
    else if(c.t==='funnel') body=funnelChart();
    else if(c.t==='kmGrid') body=keyMetricsGrid();
    else if(c.t==='deviceStatus') body=deviceStatusDonut();
    else if(c.t==='runtimeDonut') body=runtimeDonut();
    else if(c.t==='oeeTrend') body=oeeTrendCombo();
    else if(c.t==='faultFree') body=faultFreeBullet();
    else if(c.t==='oeeGroup') body=oeeGroupTornado();
    else if(c.t==='plannedRuntime') body=plannedRuntimeBars();
    else if(c.t==='lgPlanDeliver') body=lgPlanDeliver();
    else if(c.t==='lgPlanStatus') body=lgPlanStatus();
    else if(c.t==='lgRateSign') body=lgRateSign();
    else if(c.t==='lgStorageKit') body=lgStorageKit();
    else if(c.t==='lgTransitTrend') body=lgTransitTrend();
    else if(c.t==='lgLogisticsDetail') body=lgLogisticsDetail();
    else if(c.t==='qaPassPies') body=qaPassPies();
    else if(c.t==='qaRecheck') body=qaRecheck();
    else if(c.t==='qaPassTrend') body=qaPassTrend();
    else if(c.t==='qaOperation') body=qaOperation();
    else if(c.t==='qaDelivery') body=qaDelivery();
    else if(c.t==='qaDetailGrid') body=qaDetailGrid();
    else if(c.t==='bars') body=barsChart(c.d,c.cs,{h:210});
    else if(c.t==='area') body=areaLine(c.d,c.c,{h:210});
    else if(c.t==='multi') body=multiLine(c.d,c.cs,{h:210});
    else if(c.t==='donut') body=`<div style="height:100%;display:flex;align-items:center;justify-content:center">${donut(c.p,c.c,c.ct,c.n,150)}</div>`;
    else if(c.t==='progress') body=`<div class="detail-progress">${c.d.map(r=>
      `<div class="dp"><span class="dp-l">${r.l}</span><span class="dp-t"><i class="meter-anim" style="width:${r.v}%"></i></span><span class="dp-v">${r.v}%</span></div>`).join('')}</div>`;
    else if(c.t==='table') body=`<table>${c.d.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
    return `<div class="detail-chart fade-up" style="--accent:${CY};animation-delay:${i*45}ms">
      <div class="dc-head"><i></i>${c.h}</div><div class="dc-body">${body}</div></div>`;
  }
  function openDetail(key){
    const d=DETAIL[key]; if(!d) return;
    $('#detailTitle').textContent=d.title;
    $('#detailKpis').classList.toggle('k6',d.kpis.length>4);
    $('#detailKpis').innerHTML=d.kpis.map((k,i)=>
      `<div class="detail-kpi fade-up" style="--accent:${k.c};animation-delay:${i*50}ms">
        <div class="dk-lbl">${k.l}</div>
        <div class="dk-val"><span data-count="${k.v.replace(/,/g,'')}" data-dec="${k.v.includes('.')?1:0}"
          data-fmt="${k.v.includes(',')?'comma':''}">0</span><small>${k.u}</small></div>
        <div class="dk-sub">${k.s}</div></div>`).join('');
    $('#detailCharts').innerHTML=d.charts.map(detailChartHTML).join('');
    $('#detailModal').style.display='flex';
    animateView($('#detailModal'));
    toast('已展开：'+d.title);
  }

  /* ---- 数字滚动 + 进度条缓动 ---- */
  function countUp(el){
    const raw=el.dataset.count; if(raw==null) return;
    const target=parseFloat(raw), dec=parseInt(el.dataset.dec||'0'), comma=el.dataset.fmt==='comma';
    const dur=1000, t0=performance.now();
    const fmt=n=> comma ? n.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})
                        : n.toFixed(dec);
    (function frame(t){
      const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
      el.textContent=fmt(target*e);
      if(p<1) requestAnimationFrame(frame);
    })(t0);
  }
  function animateView(root){
    root.querySelectorAll('[data-count]').forEach(countUp);
    root.querySelectorAll('.mini-meters .mt i,.hb-fill,.lg-bar i').forEach(i=>{
      const w=i.dataset.w; i.style.width='0';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ i.style.width=w+'%'; }));
    });
  }

  /* ---- 首次渲染 + 视图切换（左侧完全不动） ---- */
  $('#opsGrid').innerHTML=OPS.map(opsCard).join('');
  $('#factoryView').innerHTML=factoryHTML();
  animateView($('#viewOps'));

  const detailModal=$('#detailModal');
  function closeDetail(){ detailModal.style.display='none'; }

  let curView='ops';
  function switchView(v){
    curView=v;
    closeDetail();
    const factory=v==='factory';
    const toggle=$('#viewToggle');
    toggle.classList.toggle('factory',factory);
    const labels=toggle.querySelectorAll('.vt-label');
    labels[0].classList.toggle('on',!factory);
    labels[1].classList.toggle('on',factory);
    $('#viewOps').classList.toggle('active',!factory);
    $('#viewFactory').classList.toggle('active',factory);
    const root = factory ? $('#viewFactory') : $('#viewOps');
    // 重新触发入场与数字动画（仅右侧指标区）
    root.querySelectorAll('.fade-up,.line-anim,.bar-anim,.meter-anim,.donut-anim').forEach(el=>{
      el.style.animation='none'; void el.offsetWidth; el.style.animation='';
    });
    animateView(root);
  }
  $('#viewToggle').addEventListener('click',()=>switchView(curView==='ops'?'factory':'ops'));

  /* 详情按钮（事件委托） */
  $('#opsGrid').addEventListener('click',e=>{
    const b=e.target.closest('.detail-btn'); if(b) openDetail(b.dataset.detail);
  });
  $('#detailClose').addEventListener('click',closeDetail);
  detailModal.addEventListener('click',e=>{ if(e.target===detailModal) closeDetail(); });
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&detailModal.style.display==='flex') closeDetail(); });
})();
