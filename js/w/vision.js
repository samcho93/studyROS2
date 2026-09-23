/* ===================================================================
   ROS 2 + OpenCV — 색 추적 파이프라인
   /camera ──/image_raw──▶ /color_tracker (cv_bridge + OpenCV: HSV inRange → 가장 큰 덩어리 → moments)
          ──/target (geometry_msgs/Point)──▶ /follower ──/turtle1/cmd_vel──▶ turtlesim
   위젯/보기: vision   옵션: follow=turtle, source=webcam, color=red|green|blue|yellow, fps=8
   =================================================================== */
(function () {
  'use strict';
  const esc = RosUI.esc;
  const W = 160, H = 120;

  /* ================================================== 순수 영상 처리 (OpenCV 와 같은 규칙) */
  /** RGB(0~255) → OpenCV HSV: H 0~179, S 0~255, V 0~255 */
  function rgb2hsv(r, g, b) {
    const v = Math.max(r, g, b), mn = Math.min(r, g, b), d = v - mn;
    const s = v === 0 ? 0 : Math.round(255 * d / v);
    let h = 0;
    if (d > 0) {
      if (v === r) h = 60 * (g - b) / d; else if (v === g) h = 120 + 60 * (b - r) / d; else h = 240 + 60 * (r - g) / d;
      if (h < 0) h += 360;
    }
    return [Math.round(h / 2) % 180, s, v];
  }
  /** cv2.inRange (색상이 lo>hi 이면 0/180 을 넘어가는 빨강처럼 두 구간을 합침) */
  function inRange(rgb, w, h, R) {
    const n = w * h, mask = new Uint8Array(n);
    const wrap = R.hLo > R.hHi;
    for (let i = 0, j = 0; i < n; i++, j += 3) {
      const [hh, s, v] = rgb2hsv(rgb[j], rgb[j + 1], rgb[j + 2]);
      const hOk = wrap ? (hh >= R.hLo || hh <= R.hHi) : (hh >= R.hLo && hh <= R.hHi);
      mask[i] = hOk && s >= R.sLo && s <= R.sHi && v >= R.vLo && v <= R.vHi ? 255 : 0;
    }
    return mask;
  }
  /** 3×3 열기(침식 → 팽창): 점 잡음 제거 (cv2.morphologyEx MORPH_OPEN) */
  function openMask(m, w, h) {
    const e = new Uint8Array(m.length), o = new Uint8Array(m.length);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let ok = 255;
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!m[(y + dy) * w + x + dx]) { ok = 0; break; }
      e[y * w + x] = ok;
    }
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy++) for (let dx = -1; dx <= 1; dx++) if (e[(y + dy) * w + x + dx]) { on = 255; break; }
      o[y * w + x] = on;
    }
    return o;
  }
  /** 가장 큰 연결 요소(4-이웃) → {area, cx, cy, x0,y0,x1,y1} (cv2.connectedComponentsWithStats + moments) */
  function largestBlob(mask, w, h) {
    const lab = new Int32Array(w * h); let best = null, id = 0;
    const stack = new Int32Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (!mask[p] || lab[p]) continue;
      id++; let sp = 0; stack[sp++] = p; lab[p] = id;
      let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
      while (sp) {
        const q = stack[--sp], x = q % w, y = (q / w) | 0;
        area++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && mask[q - 1] && !lab[q - 1]) { lab[q - 1] = id; stack[sp++] = q - 1; }
        if (x < w - 1 && mask[q + 1] && !lab[q + 1]) { lab[q + 1] = id; stack[sp++] = q + 1; }
        if (y > 0 && mask[q - w] && !lab[q - w]) { lab[q - w] = id; stack[sp++] = q - w; }
        if (y < h - 1 && mask[q + w] && !lab[q + w]) { lab[q + w] = id; stack[sp++] = q + w; }
      }
      if (!best || area > best.area) best = { area, cx: sx / area + 0.5, cy: sy / area + 0.5, x0, y0, x1, y1 };
    }
    return best;
  }
  const PRESETS = {
    red: { hLo: 170, hHi: 10, sLo: 120, sHi: 255, vLo: 70, vHi: 255, name: '빨강', css: '#e03131' },
    green: { hLo: 40, hHi: 85, sLo: 80, sHi: 255, vLo: 50, vHi: 255, name: '초록', css: '#2f9e44' },
    blue: { hLo: 100, hHi: 130, sLo: 120, sHi: 255, vLo: 50, vHi: 255, name: '파랑', css: '#1c7ed6' },
    yellow: { hLo: 20, hHi: 35, sLo: 100, sHi: 255, vLo: 100, vHi: 255, name: '노랑', css: '#f0b400' }
  };
  ROS._vision = { rgb2hsv, inRange, openMask, largestBlob, PRESETS };

  /* ================================================== 합성 장면 */
  function makeScene() {
    const balls = [
      { c: [220, 40, 45], r: 13, x: 50, y: 60, vx: 38, vy: 21, key: 'red' },
      { c: [45, 175, 75], r: 11, x: 110, y: 40, vx: -30, vy: 26, key: 'green' },
      { c: [40, 85, 215], r: 12, x: 90, y: 90, vx: 24, vy: -33, key: 'blue' }
    ];
    return {
      balls, hold: null,
      step(dt) {
        balls.forEach(b => {
          if (this.hold && this.hold.b === b) return;
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < b.r || b.x > W - b.r) { b.vx *= -1; b.x = Math.max(b.r, Math.min(W - b.r, b.x)); }
          if (b.y < b.r || b.y > H - b.r) { b.vy *= -1; b.y = Math.max(b.r, Math.min(H - b.r, b.y)); }
        });
      },
      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#c9c3b6'); g.addColorStop(0.55, '#b7ae9d'); g.addColorStop(0.56, '#8d8474'); g.addColorStop(1, '#6f675a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#e6c228'; ctx.fillRect(122, 18, 26, 20);                 // 노란 상자
        ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < W; x += 20) ctx.fillRect(x, 67, 1, H);
        balls.forEach(b => {
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.x + 2, b.y + b.r * 0.85, b.r * 0.9, b.r * 0.3, 0, 0, 7); ctx.fill();
          const rg = ctx.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.4, 1, b.x, b.y, b.r);
          rg.addColorStop(0, `rgb(${Math.min(255, b.c[0] + 70)},${Math.min(255, b.c[1] + 70)},${Math.min(255, b.c[2] + 70)})`);
          rg.addColorStop(0.35, `rgb(${b.c})`); rg.addColorStop(1, `rgb(${b.c.map(v => Math.round(v * 0.55))})`);
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
        });
      }
    };
  }

  const PY = `# color_tracker.py — rclpy + cv_bridge + OpenCV (이 위젯의 /color_tracker 와 같은 일)
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image
from geometry_msgs.msg import Point
from cv_bridge import CvBridge
import cv2
import numpy as np


class ColorTracker(Node):
    def __init__(self):
        super().__init__('color_tracker')
        for name, v in [('h_low', 170), ('h_high', 10), ('s_low', 120), ('s_high', 255),
                        ('v_low', 70), ('v_high', 255), ('min_area', 30)]:
            self.declare_parameter(name, v)
        self.bridge = CvBridge()
        self.sub = self.create_subscription(Image, 'image_raw', self.on_image, qos_profile_sensor_data)
        self.pub_target = self.create_publisher(Point, 'target', 10)
        self.pub_debug = self.create_publisher(Image, 'image_debug', 10)

    def on_image(self, msg):
        p = lambda n: self.get_parameter(n).value
        frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')   # ROS Image → numpy (BGR)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)                      # H 0~179, S·V 0~255
        lo_s, hi_s = (p('s_low'), p('v_low')), (p('s_high'), p('v_high'))
        if p('h_low') <= p('h_high'):
            mask = cv2.inRange(hsv, (p('h_low'), *lo_s), (p('h_high'), *hi_s))
        else:                                                             # 빨강: 0/180 경계를 넘는 색상
            mask = cv2.inRange(hsv, (p('h_low'), *lo_s), (179, *hi_s)) | \\
                   cv2.inRange(hsv, (0, *lo_s), (p('h_high'), *hi_s))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        self.pub_debug.publish(self.bridge.cv2_to_imgmsg(mask, encoding='mono8', header=msg.header))

        n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=4)
        if n < 2:
            return
        i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))               # 가장 큰 덩어리
        m = cv2.moments((labels == i).astype(np.uint8), binaryImage=True)
        if m['m00'] < p('min_area'):
            return
        cx, cy = m['m10'] / m['m00'], m['m01'] / m['m00']
        w, h = msg.width, msg.height
        t = Point()
        t.x = (cx - w / 2) / (w / 2)      # -1(왼쪽) ~ +1(오른쪽)
        t.y = (cy - h / 2) / (h / 2)      # -1(위) ~ +1(아래)
        t.z = m['m00'] / (w * h)          # 면적 비율 (가까울수록 큼)
        self.pub_target.publish(t)


def main():
    rclpy.init()
    rclpy.spin(ColorTracker())


if __name__ == '__main__':
    main()


# follower.py — /target → /turtle1/cmd_vel  (angular.z = -k · x)
# class Follower(Node):
#     def __init__(self):
#         super().__init__('follower')
#         self.k = self.declare_parameter('k_angular', 2.0).value
#         self.pub = self.create_publisher(Twist, 'turtle1/cmd_vel', 10)
#         self.create_subscription(Point, 'target', self.on_target, 10)
#     def on_target(self, p):
#         cmd = Twist(); cmd.angular.z = -self.k * p.x
#         self.pub.publish(cmd)

# 실행 (실제 PC):  ros2 run v4l2_camera v4l2_camera_node   # 또는 usb_cam
#                 ros2 run my_vision color_tracker --ros-args -p h_low:=170 -p h_high:=10
#                 ros2 run rqt_image_view rqt_image_view /image_debug`;

  /* ================================================== 화면 */
  function visionView(el, opts) {
    opts = opts || {};
    const owner = opts.owner || el;
    const root = document.createElement('div');
    root.className = 'wv';
    const R = Object.assign({}, PRESETS[opts.color] || PRESETS.red);
    const slider = (k, max, label) => `<label class="wv-sl"><span>${label}</span><input type="range" min="0" max="${max}" data-k="${k}" value="${R[k]}"><b class="w-out" data-kv="${k}">${R[k]}</b></label>`;
    root.innerHTML = `
      <div class="wv-top">
        <span class="w-seg wv-src"><button data-src="synthetic" class="on">🎨 합성 장면</button><button data-src="webcam">📷 웹캠</button></span>
        <span class="wv-presets">${Object.keys(PRESETS).map(k => `<button class="wv-pre${k === (opts.color || 'red') ? ' on' : ''}" data-pre="${k}" style="--pc:${PRESETS[k].css}">${PRESETS[k].name}</button>`).join('')}</span>
        <label class="small"><input type="checkbox" class="wv-follow"${opts.follow === 'turtle' ? ' checked' : ''}> 🐢 /follower 노드 (거북이가 공을 향해 회전)</label>
      </div>
      <div class="wv-msg" hidden></div>
      <div class="wv-panels">
        <figure><canvas class="wv-cv wv-orig" width="${W}" height="${H}"></canvas><figcaption>① /image_raw <span class="muted">+ 검출 표시</span></figcaption></figure>
        <figure><canvas class="wv-cv wv-mask" width="${W}" height="${H}"></canvas><figcaption>② /image_debug <span class="muted">(inRange 마스크)</span></figcaption></figure>
        <figure><canvas class="wv-cv wv-over" width="${W}" height="${H}"></canvas><figcaption>③ 겹쳐 보기 <span class="muted">(원본 × 마스크)</span></figcaption></figure>
      </div>
      <div class="wv-mid">
        <div class="wv-sliders">
          <div class="wv-huebar"><i class="wv-hsel"></i><i class="wv-hsel2"></i></div>
          ${slider('hLo', 179, 'H 최소')}${slider('hHi', 179, 'H 최대')}${slider('sLo', 255, 'S 최소')}${slider('sHi', 255, 'S 최대')}${slider('vLo', 255, 'V 최소')}${slider('vHi', 255, 'V 최대')}
          <div class="w-help">OpenCV 의 HSV 는 <b>H 0~179</b>(도÷2), S·V 0~255 입니다. H 최소 &gt; H 최대이면 빨강처럼 0/180 경계를 넘는 구간으로 봅니다.</div>
        </div>
        <div class="wv-out">
          <div class="wv-tgt w-out"></div>
          <canvas class="wv-dial"></canvas>
          <div class="wv-turtle small"></div>
        </div>
      </div>
      <div class="wv-pipe">
        <div class="wv-pn">📷<b>/camera</b><small>${W}×${H} rgb8</small></div>
        <div class="wv-pa"><span>/image_raw</span><em data-hz="/image_raw">0 Hz</em></div>
        <div class="wv-grp"><span class="wv-glbl">/color_tracker 노드</span>
          <div class="wv-pn">🔁<b>cv_bridge</b><small>imgmsg_to_cv2</small></div>
          <div class="wv-pa s"><span>numpy</span></div>
          <div class="wv-pn">🧪<b>OpenCV</b><small>cvtColor · inRange · moments</small></div>
        </div>
        <div class="wv-pa"><span>/target</span><em data-hz="/target">0 Hz</em></div>
        <div class="wv-pn wv-fol">🎯<b>/follower</b><small>ω = −k·x</small></div>
        <div class="wv-pa wv-fol"><span>/turtle1/cmd_vel</span><em data-hz="/turtle1/cmd_vel">0 Hz</em></div>
        <div class="wv-pn wv-fol">🐢<b>turtlesim</b><small>회전</small></div>
      </div>
      <div class="wv-side small muted">곁가지: /color_tracker → <code>/image_debug</code> (mono8 마스크) <em class="w-out" data-hz="/image_debug">0 Hz</em></div>
      <details class="wv-det"><summary>🐍 실제 ROS 2 파이썬 노드 (rclpy + cv_bridge + cv2.inRange + cv2.moments)</summary><pre class="wv-code">${esc(PY)}</pre></details>`;
    el.appendChild(root);
    const $ = s => root.querySelector(s);
    const msgEl = $('.wv-msg');
    const note = (html, cls) => { msgEl.hidden = !html; msgEl.className = 'wv-msg ' + (cls || ''); msgEl.innerHTML = html || ''; };

    /* ---- 카메라 노드 */
    const cam = { src: 'synthetic', scene: makeScene(), stream: null, video: null, cv: document.createElement('canvas') };
    cam.cv.width = W; cam.cv.height = H;
    const cctx = cam.cv.getContext('2d', { willReadFrequently: true });
    const nCam = ROS.createNode('camera', { owner, pkg: 'v4l2_camera', exe: 'v4l2_camera_node' });
    const fps = nCam.declareParameter('fps', +opts.fps || 8, { description: '초당 프레임 (Hz)' });
    nCam.declareParameter('image_size', [W, H], { description: '[폭, 높이]', read_only: true });
    const pImg = nCam.createPublisher('sensor_msgs/msg/Image', 'image_raw', 'sensor_data');
    let seq = 0, lastT = performance.now();
    function grab() {
      const now = performance.now(), dt = Math.min(0.3, (now - lastT) / 1000); lastT = now;
      if (cam.src === 'webcam' && cam.video && cam.video.readyState >= 2) {
        const vw = cam.video.videoWidth, vh = cam.video.videoHeight, k = Math.max(W / vw, H / vh);
        const sw = W / k, sh = H / k;
        cctx.drawImage(cam.video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
      } else { cam.scene.step(dt); cam.scene.draw(cctx); }
      const px = cctx.getImageData(0, 0, W, H).data, data = new Uint8Array(W * H * 3);
      for (let i = 0, j = 0; i < px.length; i += 4, j += 3) { data[j] = px[i]; data[j + 1] = px[i + 1]; data[j + 2] = px[i + 2]; }
      pImg.publish({ header: { stamp: ROS.graph.now(), frame_id: 'camera_optical_frame' }, height: H, width: W, encoding: 'rgb8', is_bigendian: 0, step: W * 3, data });
      seq++;
    }
    let camTimer = nCam.createTimer(1 / fps, grab);
    ROS.on('param', (n, name, v) => { if (n === nCam && name === 'fps') { camTimer.cancel(); camTimer = nCam.createTimer(1 / Math.max(0.5, Math.min(30, +v || 8)), grab); } });
    function stopStream() { if (cam.stream) { cam.stream.getTracks().forEach(t => t.stop()); cam.stream = null; } if (cam.video) { cam.video.srcObject = null; cam.video = null; } }
    nCam.onDestroy = stopStream;
    async function useWebcam() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { note('이 브라우저에서는 웹캠을 쓸 수 없습니다 (https 또는 localhost 에서만 동작). 합성 장면을 사용합니다.', 'warn'); setSrc('synthetic'); return; }
      note('카메라 권한을 요청하는 중… 브라우저 위쪽의 허용 버튼을 눌러 주세요.');
      try {
        const st = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' }, audio: false });
        if (!root.isConnected || cam.src !== 'webcam') { st.getTracks().forEach(t => t.stop()); return; }
        cam.stream = st; const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = st; await v.play(); cam.video = v;
        note('📷 웹캠 영상을 /image_raw 로 발행 중입니다. 색 공이나 물건을 비춰 보세요. (영상은 브라우저 밖으로 나가지 않습니다)', 'ok');
        setTimeout(() => { if (cam.src === 'webcam') note(''); }, 5000);
      } catch (e) {
        const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
        note(denied ? '🚫 카메라 권한이 거부되었습니다. 주소창의 카메라 아이콘에서 허용할 수 있습니다. 지금은 합성 장면을 씁니다.' : `카메라를 열 수 없습니다 (${esc(e && e.name || e)}). 합성 장면을 씁니다.`, 'warn');
        setSrc('synthetic');
      }
    }
    function setSrc(s) {
      cam.src = s; root.querySelectorAll('[data-src]').forEach(b => b.classList.toggle('on', b.dataset.src === s));
      if (s === 'webcam') useWebcam(); else stopStream();
    }
    root.querySelectorAll('[data-src]').forEach(b => b.onclick = () => setSrc(b.dataset.src));

    /* ---- /color_tracker 노드 */
    const nTr = ROS.createNode('color_tracker', { owner, pkg: 'my_vision', exe: 'color_tracker' });
    const PN = { hLo: 'h_low', hHi: 'h_high', sLo: 's_low', sHi: 's_high', vLo: 'v_low', vHi: 'v_high' };
    Object.keys(PN).forEach(k => nTr.declareParameter(PN[k], R[k], { description: `HSV 범위 (${k[0].toUpperCase()} ${k.endsWith('Lo') ? '최소' : '최대'})`, type: 'integer' }));
    nTr.declareParameter('min_area', 30, { description: '이보다 작은 덩어리는 무시 [픽셀]', type: 'integer' });
    const pTgt = nTr.createPublisher('geometry_msgs/msg/Point', 'target', 10);
    const pDbg = nTr.createPublisher('sensor_msgs/msg/Image', 'image_debug', 10);
    const tr = { img: null, mask: null, blob: null, t: 0, target: null };
    nTr.createSubscription('sensor_msgs/msg/Image', 'image_raw', msg => {
      if (msg.encoding !== 'rgb8' && msg.encoding !== 'bgr8') { nTr.warn(`지원하지 않는 encoding: ${msg.encoding}`); return; }
      const w = msg.width, h = msg.height; let d = msg.data;
      if (msg.encoding === 'bgr8') { const c = new Uint8Array(d.length); for (let i = 0; i < d.length; i += 3) { c[i] = d[i + 2]; c[i + 1] = d[i + 1]; c[i + 2] = d[i]; } d = c; }
      const Rr = {}; Object.keys(PN).forEach(k => { Rr[k] = +nTr.getParameter(PN[k]); });
      const mask = openMask(inRange(d, w, h, Rr), w, h);
      pDbg.publish({ header: msg.header, height: h, width: w, encoding: 'mono8', is_bigendian: 0, step: w, data: mask });
      const b = largestBlob(mask, w, h);
      tr.img = { d, w, h }; tr.mask = mask; tr.t = performance.now();
      if (b && b.area >= nTr.getParameter('min_area')) {
        tr.blob = b;
        tr.target = { x: (b.cx - w / 2) / (w / 2), y: (b.cy - h / 2) / (h / 2), z: b.area / (w * h) };
        pTgt.publish(tr.target);
      } else { tr.blob = null; tr.target = null; }
    }, 'sensor_data');
    // 슬라이더 ↔ 파라미터 (ros2 param set 으로 바꿔도 슬라이더가 따라감)
    ROS.on('param', (n, name, v) => {
      if (n !== nTr) return;
      const k = Object.keys(PN).find(x => PN[x] === name); if (!k) return;
      R[k] = +v; const inp = root.querySelector(`[data-k="${k}"]`); if (inp && +inp.value !== +v) inp.value = v;
      root.querySelector(`[data-kv="${k}"]`).textContent = v; drawHue();
    });
    root.querySelectorAll('[data-k]').forEach(inp => inp.oninput = () => { nTr.setParameters([{ name: PN[inp.dataset.k], value: +inp.value }]); root.querySelectorAll('.wv-pre').forEach(b => b.classList.remove('on')); });
    root.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => {
      const p = PRESETS[b.dataset.pre];
      nTr.setParameters(Object.keys(PN).map(k => ({ name: PN[k], value: p[k] })));
      root.querySelectorAll('.wv-pre').forEach(x => x.classList.toggle('on', x === b));
    });

    /* ---- /follower 노드 (선택) */
    let nFol = null, folTurtle = '';
    function setFollow(on) {
      if (on && !nFol) {
        nFol = ROS.createNode('follower', { owner, pkg: 'my_vision', exe: 'follower' });
        const k = nFol.declareParameter('k_angular', 2.0, { description: '회전 이득 k (ω = −k·x)' });
        const pub = nFol.createPublisher('geometry_msgs/msg/Twist', 'turtle1/cmd_vel', 10);
        let last = 0, stopped = true;
        nFol.createSubscription('geometry_msgs/msg/Point', 'target', p => { last = performance.now(); stopped = false; pub.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: -nFol.getParameter('k_angular') * p.x } }); }, 10);
        nFol.createTimer(0.2, () => { if (!stopped && performance.now() - last > 500) { stopped = true; pub.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }); } });
        void k;
      } else if (!on && nFol) { nFol.destroy(); nFol = null; }
      root.classList.toggle('wv-nofol', !nFol);
    }
    $('.wv-follow').onchange = e => setFollow(e.target.checked);
    setFollow(opts.follow === 'turtle');

    /* ---- 원본 패널 끌기: 합성 장면의 공을 옮김 */
    const cvO = $('.wv-orig');
    const toImg = e => { const r = cvO.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cvO.addEventListener('pointerdown', e => {
      if (cam.src !== 'synthetic') return;
      const [x, y] = toImg(e); const b = cam.scene.balls.find(b => Math.hypot(b.x - x, b.y - y) < b.r + 4); if (!b) return;
      cvO.setPointerCapture(e.pointerId); cam.scene.hold = { b };
    });
    cvO.addEventListener('pointermove', e => { const h = cam.scene.hold; if (!h) return; const [x, y] = toImg(e); h.b.x = Math.max(h.b.r, Math.min(W - h.b.r, x)); h.b.y = Math.max(h.b.r, Math.min(H - h.b.r, y)); });
    const rel = () => { cam.scene.hold = null; };
    cvO.addEventListener('pointerup', rel); cvO.addEventListener('pointercancel', rel);

    /* ---- 그리기 */
    const ctxO = cvO.getContext('2d'), ctxM = $('.wv-mask').getContext('2d'), ctxV = $('.wv-over').getContext('2d');
    const idO = ctxO.createImageData(W, H), idM = ctxM.createImageData(W, H), idV = ctxV.createImageData(W, H);
    function drawHue() {
      const bar = $('.wv-huebar'), a = $('.wv-hsel'), b = $('.wv-hsel2');
      const pct = v => (v / 180 * 100).toFixed(2) + '%';
      if (R.hLo <= R.hHi) { a.style.left = pct(R.hLo); a.style.width = pct(R.hHi - R.hLo + 1); b.style.display = 'none'; }
      else { a.style.left = pct(R.hLo); a.style.width = pct(180 - R.hLo); b.style.display = ''; b.style.left = '0'; b.style.width = pct(R.hHi + 1); }
      void bar;
    }
    drawHue();
    let lastDrawn = 0, acc = 0;
    const dial = $('.wv-dial');
    const stop = RosUI.loop(root, dt => {
      const C = RosUI.colors();
      if (tr.img && tr.t !== lastDrawn) {
        lastDrawn = tr.t;
        const d = tr.img.d, m = tr.mask;
        for (let i = 0, j = 0, k = 0; i < W * H; i++, j += 4, k += 3) {
          idO.data[j] = d[k]; idO.data[j + 1] = d[k + 1]; idO.data[j + 2] = d[k + 2]; idO.data[j + 3] = 255;
          const on = m[i];
          idM.data[j] = idM.data[j + 1] = idM.data[j + 2] = on; idM.data[j + 3] = 255;
          if (on) { idV.data[j] = d[k]; idV.data[j + 1] = d[k + 1]; idV.data[j + 2] = d[k + 2]; }
          else { const g = (d[k] + d[k + 1] + d[k + 2]) / 3 * 0.35; idV.data[j] = idV.data[j + 1] = idV.data[j + 2] = g; }
          idV.data[j + 3] = 255;
        }
        ctxO.putImageData(idO, 0, 0); ctxM.putImageData(idM, 0, 0); ctxV.putImageData(idV, 0, 0);
        const b = tr.blob;
        [ctxO, ctxV].forEach(c => {
          c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(W / 2 + 0.5, 0); c.lineTo(W / 2 + 0.5, H); c.stroke();
          if (!b) return;
          c.strokeStyle = '#00ff88'; c.lineWidth = 1.5; c.strokeRect(b.x0 - 0.5, b.y0 - 0.5, b.x1 - b.x0 + 2, b.y1 - b.y0 + 2);
          c.beginPath(); c.moveTo(b.cx - 6, b.cy); c.lineTo(b.cx + 6, b.cy); c.moveTo(b.cx, b.cy - 6); c.lineTo(b.cx, b.cy + 6); c.stroke();
        });
        if (b) { ctxO.fillStyle = '#00ff88'; ctxO.font = '9px monospace'; ctxO.fillText(`(${b.cx.toFixed(0)},${b.cy.toFixed(0)})`, Math.min(W - 48, b.x1 + 3), Math.max(9, b.y0)); }
      }
      // 목표 다이얼: x 위치 막대 + 회전 명령
      const { w, h, ctx } = RosUI.fitCanvas(dial);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, y = h * 0.42, half = w / 2 - 14;
      ctx.strokeStyle = C.line; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx + half, y); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('−1 (왼쪽)', cx - half + 18, y + 16); ctx.fillText('0', cx, y + 16); ctx.fillText('+1 (오른쪽)', cx + half - 22, y + 16);
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, y - 8); ctx.lineTo(cx, y + 6); ctx.stroke();
      const t = tr.target && performance.now() - tr.t < 600 ? tr.target : null;
      if (t) {
        const px = cx + t.x * half;
        ctx.fillStyle = R.hLo > R.hHi ? PRESETS.red.css : C.accent; ctx.beginPath(); ctx.arc(px, y, 6 + Math.sqrt(t.z) * 30, 0, 7); ctx.fill();
        if (nFol) { const wz = -nFol.getParameter('k_angular') * t.x; ctx.strokeStyle = C.green; ctx.fillStyle = C.green; ctx.lineWidth = 2.5; RosUI.arrow(ctx, cx, h - 12, cx - wz * half * 0.25, h - 12, 7); ctx.fillStyle = C.fg; ctx.fillText(`ω = ${wz.toFixed(2)} rad/s`, cx, h - 20); }
      } else { ctx.fillStyle = C.muted; ctx.fillText('목표 없음', cx, y - 12); }
      ctx.textAlign = 'left';
      acc += dt;
      if (acc > 0.4) {
        acc = 0;
        root.querySelectorAll('[data-hz]').forEach(e => { const hz = ROS.hz(e.dataset.hz); e.textContent = hz ? hz.toFixed(1) + ' Hz' : '0 Hz'; e.classList.toggle('live', hz > 0); });
        $('.wv-tgt').innerHTML = t ? `/target → x <b>${t.x.toFixed(2)}</b> · y <b>${t.y.toFixed(2)}</b> · z(면적) <b>${t.z.toFixed(3)}</b>` : '/target → <span class="muted">발행 안 함 (덩어리 없음 / min_area 미만)</span>';
        const ts = ROS.findTurtlesim && ROS.findTurtlesim();
        const tinfo = nFol ? (ts ? '🐢 turtlesim 이 있습니다 — 거북이가 공 쪽으로 돕니다.' : '🐢 이 페이지에 turtlesim 이 없습니다. 터미널에서 <code>ros2 run turtlesim turtlesim_node</code> 를 실행해 보세요.') : '/follower 가 꺼져 있습니다.';
        if (tinfo !== folTurtle) { folTurtle = tinfo; $('.wv-turtle').innerHTML = tinfo; }
      }
    });
    const watch = setInterval(() => { if (!root.isConnected) { clearInterval(watch); stopStream(); stop(); } }, 1000);
    if (opts.source === 'webcam') setSrc('webcam');
    return () => { clearInterval(watch); stop(); stopStream(); [nCam, nTr, nFol].forEach(n => n && n.destroy()); };
  }

  RosUI.registerView('vision', visionView, { title: 'ROS 2 + OpenCV 색 추적', icon: '👁', w: 860, h: 720 });
  Widgets.register('vision', (el, o) => {
    const body = RosUI.frame(el, '👁', 'ROS 2 + OpenCV — 색 추적 노드');
    return visionView(body, Object.assign({}, o, { owner: el }));
  }, { title: 'ROS 2 + OpenCV 색 추적' });
})();
