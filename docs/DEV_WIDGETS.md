# WebROS 위젯 개발 가이드 (개발자용)

이 사이트는 빌드 도구 없이 `<script>` 로 읽히는 **순수 JavaScript(ES2020, 모듈 문법 없음)** 정적 사이트입니다.
모든 위젯은 한 페이지 안의 **같은 ROS 2 그래프(WebROS)** 를 공유합니다. 터미널에서 `ros2 topic list` 를 치면
turtlesim 위젯 · 파이썬 실습 · 로봇 시뮬레이터가 만든 노드/토픽이 함께 보여야 합니다.

## 0. 파일 배치 (충돌 방지)

| 파일 | 담당 |
|---|---|
| `js/ros-msgs.js` | 인터페이스 정의 (`window.ROS_IFACES['pkg/msg/Type'] = '.msg 텍스트'`) — 새 타입이 필요하면 **자기 위젯 파일 안에서** `ROS_IFACES['x/msg/Y'] = ...` 로 추가 |
| `js/ros.js` | 그래프 코어 `window.ROS` |
| `js/ros-ui.js` | 창 · 캔버스 도우미 `window.RosUI` |
| `js/widgets.js` | 위젯 등록소 `window.Widgets` |
| `js/ros-pkgs.js` | 실행 파일 등록소(`ros2 run`/`ros2 launch`) + 기본 패키지 |
| `js/w/<그룹>.js` | 위젯 구현 — 그룹마다 한 파일 |
| `css/w-<그룹>.css` | 그 그룹 위젯 CSS — 클래스 접두어를 그룹별로 (`wm-` 모바일, `wa-` 팔, `wg2-` Go2, `wc-` 개념 …) |

`index.html` / `presenter.html` 의 `<script>` 순서: ros-msgs → ros → ros-ui → widgets → ros-pkgs → ros-term → pyros → js/w/*.js → render/ink/slides/app.

## 1. `window.ROS` (js/ros.js)

```js
const n = ROS.createNode('talker', { namespace: '/', owner: el, pkg: 'demo_nodes_py', exe: 'talker',
                                     remap: {'chatter': '/my_chatter'}, params: {rate: 2}, out: line => ... });
// owner: 위젯 DOM 요소. 요소가 문서에서 사라지면(장 이동) 노드가 자동 삭제됩니다.
// out: 로그 한 줄을 받을 함수(터미널). 없으면 console.

const pub = n.createPublisher('std_msgs/msg/String', 'chatter', 10 /* 또는 'sensor_data' | {reliability:'best_effort', durability:'transient_local', depth:1} */);
pub.publish({ data: 'hi' });                 // 빠진 필드는 받는 쪽에서 기본값. 온전한 메시지는 ROS.make(type, partial)
const sub = n.createSubscription('std_msgs/msg/String', 'chatter', (msg, info) => {}, 10);
const srv = n.createService('example_interfaces/srv/AddTwoInts', 'add_two_ints', (req, res) => { res.sum = req.a + req.b; return res; }); // Promise 반환도 가능
const cli = n.createClient('example_interfaces/srv/AddTwoInts', 'add_two_ints'); await cli.waitForService(1); const r = await cli.call({a:1,b:2});
const as = n.createActionServer('turtlesim/action/RotateAbsolute', 'turtle1/rotate_absolute', {
  goal: req => true,                         // false 면 거절 (선택)
  cancel: req => true,                       // (선택)
  execute: async gh => { gh.publishFeedback({remaining: 1}); if (gh.isCancelRequested) { gh.canceled({delta:0}); return; } return { delta: 1.2 }; } // 반환값 = 결과(성공)
});
const ac = n.createActionClient(type, name); const g = await ac.sendGoal({theta: 1.57}, { feedback: fb => {} }); // g.accepted, g.result(Promise → {status, result}), g.cancel()
n.declareParameter('background_r', 69, { description: '...', type: 'integer' /*선택*/, read_only: false });
n.getParameter('background_r'); n.onSetParameters(list => ({ successful: true })); // ROS.on('param', (node, name, value) => ...)
n.createTimer(0.1, () => {});                // 초 단위
n.info('text'); n.warn(); n.error();         // [INFO] [시각] [노드]: text  → out + /rosout
n.destroy();

ROS.make(type, partial)   ROS.toYaml(msg, type)   ROS.parseYaml('{linear: {x: 1.0}}')   ROS.showIface(type)
ROS.nodes()  ROS.findNode('/turtlesim')  ROS.topicList() → [{name,type,pubs,subs}]  ROS.topic(name) → {pubs,subs,last,count,stamps}
ROS.serviceList()  ROS.actionList()  ROS.callService(name, type|null, req)  ROS.sendGoal(name, goal, {feedback})  ROS.hz(topic)
ROS.publishOnce(topic, type, msg)
ROS.on('graph', fn)  // 노드/토픽/서비스 변화     ROS.on('pub', (topic, msg, pub) => …)  ROS.on('log', ({level,node,text,line}) => …)
ROS.graph.tf.lookup(target, source) → {t:{x,y,z}, q:{x,y,z,w}}   // /tf, /tf_static 발행은 자동으로 TF 버퍼에 들어감
ROS.graph.tf.list() / .frames / .has(frame)
ROS.math: yawToQ(y) rpyToQ(r,p,y) qToYaw(q) qToRpy(q) qMul qRot tMul tInv tIdent normAngle deg rad clamp
ROS.graph.now() → {sec, nanosec}   ROS.graph.nowSec()
```

메시지는 평범한 JS 객체입니다(필드 이름은 실제 ROS 2 와 같게). 받은 메시지는 복사본입니다.

## 2. `window.RosUI` (js/ros-ui.js)

```js
RosUI.frame(el, '🐢', '제목', '직접 해 보기') → 몸통 div (위젯 머리 포함)
RosUI.win({ title, icon, w, h, content: (body, win) => cleanupFn }) → { body, close(), setTitle(), focus() }  // 떠 있는 창
RosUI.registerView('rviz', (el, opts) => cleanupFn, { title: 'RViz2', icon: '🧭', w: 720, h: 520 })  // 창/위젯 공용 화면
RosUI.openView('rviz', { viewOpts: {...} })     // 창으로 열기 (터미널 `ros2 run rviz2 rviz2` 가 이걸 씀)
RosUI.popoutBtn('rviz', opts)                   // "⧉ 창으로" 버튼 HTML
RosUI.fitCanvas(canvas) → { w, h, ctx }          // DPR 반영. 매 프레임 호출해도 됨
RosUI.loop(el, (dt, t) => {})  → stop()          // el 이 문서에서 빠지면 자동 정지, 안 보이면 건너뜀
RosUI.colors() → { fg, muted, line, card, card2, bg, accent, blue, teal, orange, purple, red, green, yellow, gray, dark }
RosUI.arrow(ctx, x1, y1, x2, y2, head)   RosUI.esc(s)   RosUI.fmt(v, digits)   RosUI.toast(msg)
```

## 3. 위젯 등록 (js/widgets.js)

```js
Widgets.register('bot', (el, o) => {        // o = {{widget:bot|world=maze|mode=slam}} 의 옵션 (문자열)
  const body = RosUI.frame(el, '🤖', '차동 구동 로봇 시뮬레이터');
  ...
  return () => { /* 정리: 노드 destroy, 타이머 해제 */ };
}, { title: '차동 구동 로봇 시뮬레이터' });
```

- 위젯은 **문서(폭 700~900px)** 와 **슬라이드(1280×720 무대, 본문 높이 약 560px)** 모두에서 동작해야 합니다. `.slide .widget` 안에서는 높이를 줄이세요.
- 모바일 폭(360px)에서 가로 스크롤이 생기지 않게 (flex-wrap, max-width:100%).
- 색은 CSS 변수로 (`var(--fg)`, `var(--card2)`, `var(--line)`, `var(--accent)`, `var(--c-blue)` …). 캔버스는 `RosUI.colors()` 로 매 프레임 읽어 **다크 모드 대응**.
- 공용 CSS 클래스: `.w-body` `.w-row` `.w-in` `.w-help` `.w-out` `.w-btns` `.w-seg`(버튼 묶음, `.on`) `.btn` `.btn.tiny` `.btn.small` `.btn.primary` `.btn.ghost` `.tbl` `.muted` `.small`.
- 노드를 만들 때 `owner: el` 을 꼭 넘기세요 (장 이동 시 자동 정리). 같은 이름 노드가 이미 있으면(다른 위젯이 만든 것) 재사용할지 판단하세요 — 예: `ROS.findNode('/turtlesim')`.
- 한 장에 같은 위젯이 두 개 있을 수 있습니다 → 전역 변수 대신 클로저 상태.
- 무거운 루프는 `RosUI.loop` 로 (안 보이면 멈춤).

## 4. 실행 파일 등록 (js/ros-pkgs.js)

터미널의 `ros2 run <pkg> <exe> [args]` / `ros2 launch <pkg> <file> [k:=v]` 는 등록소에서 찾아 실행합니다.

```js
ROS.registerPkg('webbot_sim', {
  desc: '브라우저용 차동 구동 로봇 시뮬레이터',
  exes: {
    sim_node(ctx) {                        // ctx = { argv, args:{remap,params,name,ns}, out(line), err(line), openView(name, viewOpts) → win }
      const n = ROS.createNode(ctx.args.name || 'webbot', { namespace: ctx.args.ns, remap: ctx.args.remap, params: ctx.args.params, out: ctx.out, pkg: 'webbot_sim', exe: 'sim_node' });
      const w = ctx.openView('bot', { mode: 'drive' });     // 필요하면 창을 띄움
      return { nodes: [n], stop() { w && w.close(); } };    // stop 은 Ctrl+C 때 호출 (노드는 자동 destroy)
    }
  },
  launch: {
    'world.launch.py'(ctx) { /* ctx.largs = {name: value} (k:=v 인자) */ return ROS.runMany(ctx, [['webbot_sim','sim_node',[]], ['rviz2','rviz2',[]]]); }
  },
  files: { 'launch/world.launch.py': '...파이썬 런치 파일 원문(보여 주기용)...' }   // (선택) ros2 pkg prefix / cat 용
});
ROS.run(pkg, exe, argv, io) → proc { nodes, stop(), done(Promise) }      // 다른 곳에서 실행할 때
ROS.runMany(ctx, [[pkg, exe, argv], ...]) → proc                        // 런치에서 여러 개
```

## 5. 슬라이드 · 문서 둘 다

- 위젯 옵션은 문자열입니다 (`o.mode === 'slam'`, `+o.h || 360`).
- 첫 화면이 비어 보이지 않게, 마운트 즉시 무언가 움직이거나 안내가 보이게 합니다.
- 설명 문구는 한국어, 존댓말. 코드 · 토픽 이름은 실제 ROS 2 와 같게.
- 브라우저 도구는 쓰지 말고 `node --check js/w/xxx.js` 로 문법만 확인해도 됩니다(최종 화면 검수는 따로 합니다).
