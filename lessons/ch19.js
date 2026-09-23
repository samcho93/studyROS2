/* 19장 — 비전과 AI: OpenCV · cv_bridge · LeRobot */
Course.lesson({
  id: 'ch19', no: '19',
  icon: '👁️',
  title: '비전과 AI — OpenCV · cv_bridge · LeRobot',
  subtitle: '카메라 영상이 토픽이 되고, 토픽이 로봇의 행동이 되기까지',
  level: '심화', time: '150분',
  goals: [
    'sensor_msgs/Image 의 height · width · encoding · step · data 가 무엇을 뜻하는지 설명할 수 있다',
    '카메라 드라이버 → image_transport → 처리 노드로 이어지는 이미지 파이프라인과 sensor_data QoS 를 설명할 수 있다',
    'cv_bridge 로 ROS 이미지와 OpenCV 배열을 오가며, bgr8 · rgb8 혼동을 피할 수 있다',
    'HSV 색 추적 → /target → cmd_vel 파이프라인을 직접 실행하고 파라미터를 조정할 수 있다',
    'YOLO 검출(vision_msgs) · 깊이 카메라(PointCloud2) · LeRobot 모방학습 · VLA 가 ROS 2 와 어떻게 연결되는지 말할 수 있다'
  ],
  teacher: {
    intro: '“사람은 눈으로 공을 보고 손을 뻗습니다. 로봇은 무엇으로 ‘본다’고 할 수 있을까요?” 하고 묻습니다. 답이 “카메라”로 나오면 “카메라가 준 숫자 덩어리를 로봇이 어떻게 행동으로 바꿀까요?”로 이어 가며, 오늘은 그 숫자 덩어리(sensor_msgs/Image)부터 시작한다고 알립니다. (3분)',
    flow: '① 도입 · Image 메시지 해부 15분 → ② 카메라 드라이버 · image_transport · QoS 15분 → ③ cv_bridge 와 bgr8/rgb8 함정 15분 → ④ 색 추적 위젯 + turtlesim 실습 30분 → ⑤ 전체 노드 코드 읽기 · 파이썬 실습 20분 → ⑥ YOLO 검출 · 깊이 카메라 20분 → ⑦ LeRobot · VLA · Isaac ROS 동향 15분 → ⑧ 퀴즈 · 정리 10분'
  },

  figs: {
    /* ---------------------------------------------------------------- Image 메시지 해부 */
    imageMsg: {
      caption: 'sensor_msgs/Image — 픽셀을 한 줄로 늘어놓은 바이트 배열(data)과, 그것을 다시 2차원으로 읽는 방법(height · width · encoding · step)',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="4 곱하기 3 픽셀 이미지가 data 배열로 펼쳐지는 모습과 Image 메시지 필드">
  <text x="170" y="26" class="t-b t-c">가로 4 × 세로 3 픽셀 (rgb8)</text>
  <rect x="40" y="46" width="60" height="50" class="red"/><rect x="100" y="46" width="60" height="50" class="green"/><rect x="160" y="46" width="60" height="50" class="blue"/><rect x="220" y="46" width="60" height="50" class="yellow"/>
  <rect x="40" y="96" width="60" height="50" class="gray"/><rect x="100" y="96" width="60" height="50" class="red"/><rect x="160" y="96" width="60" height="50" class="red"/><rect x="220" y="96" width="60" height="50" class="gray"/>
  <rect x="40" y="146" width="60" height="50" class="gray"/><rect x="100" y="146" width="60" height="50" class="gray"/><rect x="160" y="146" width="60" height="50" class="teal"/><rect x="220" y="146" width="60" height="50" class="gray"/>
  <text x="70" y="71" class="t-xs t-c t-mono">R G B</text><text x="130" y="71" class="t-xs t-c t-mono">R G B</text>
  <text x="300" y="71" class="t-xs t-mu">0행</text><text x="300" y="121" class="t-xs t-mu">1행</text><text x="300" y="171" class="t-xs t-mu">2행</text>
  <line x1="40" y1="212" x2="280" y2="212" class="ln-orange ar2"/>
  <text x="160" y="228" class="t-xs t-c t-orange">width = 4 픽셀 → step = 4 × 3 = 12 바이트</text>
  <line x1="24" y1="46" x2="24" y2="196" class="ln-purple ar2"/>
  <text x="14" y="121" class="t-xs t-c t-purple">3</text>

  <text x="170" y="262" class="t-sm t-b t-c">data (uint8[]) — 행을 차례로 이어 붙임</text>
  <rect x="30" y="278" width="96" height="30" rx="4" class="red"/><text x="78" y="293" class="t-xs t-c t-mono">255,0,0</text>
  <rect x="126" y="278" width="96" height="30" rx="4" class="green"/><text x="174" y="293" class="t-xs t-c t-mono">0,200,0</text>
  <rect x="222" y="278" width="60" height="30" rx="4" class="box"/><text x="252" y="293" class="t-xs t-c t-mono">…</text>
  <text x="30" y="328" class="t-xs t-mu">0행 12바이트 → 1행 12바이트 → 2행 12바이트</text>
  <text x="30" y="350" class="t-xs t-mu">전체 크기 = step × height = 36 바이트</text>

  <rect x="400" y="30" width="460" height="330" rx="14" class="blue"/>
  <text x="630" y="56" class="t-b t-c t-blue">sensor_msgs/msg/Image</text>
  <text x="420" y="92" class="t-sm t-mono">std_msgs/Header header</text><text x="840" y="92" class="t-xs t-e t-mu">시각 + frame_id</text>
  <text x="420" y="124" class="t-sm t-mono">uint32 height</text><text x="840" y="124" class="t-xs t-e t-mu">세로 픽셀 수 (행 수)</text>
  <text x="420" y="156" class="t-sm t-mono">uint32 width</text><text x="840" y="156" class="t-xs t-e t-mu">가로 픽셀 수 (열 수)</text>
  <text x="420" y="188" class="t-sm t-mono">string encoding</text><text x="840" y="188" class="t-xs t-e t-mu">rgb8 · bgr8 · mono8 · 16UC1 …</text>
  <text x="420" y="220" class="t-sm t-mono">uint8 is_bigendian</text><text x="840" y="220" class="t-xs t-e t-mu">바이트 순서</text>
  <text x="420" y="252" class="t-sm t-mono">uint32 step</text><text x="840" y="252" class="t-xs t-e t-mu">한 행의 바이트 수</text>
  <text x="420" y="284" class="t-sm t-mono">uint8[] data</text><text x="840" y="284" class="t-xs t-e t-mu">step × height 바이트</text>
  <rect x="420" y="306" width="420" height="40" rx="8" class="box"/>
  <text x="630" y="326" class="t-xs t-c">640×480 rgb8 = 921,600 바이트 ≈ 0.9 MB · 30 fps 면 초당 약 27 MB</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 카메라 파이프라인 */
    camPipe: {
      caption: '카메라 드라이버가 raw 이미지와 camera_info 를 발행하고, image_transport 가 같은 영상을 압축 토픽으로도 내보냅니다',
      svg: `<svg class="dg" viewBox="0 0 900 360" role="img" aria-label="카메라 드라이버 노드에서 image_raw, compressed, camera_info 토픽을 거쳐 처리 노드로 가는 그림">
  <text x="90" y="30" class="t-sm t-c t-mu">USB · CSI · RealSense</text>
  <rect x="40" y="46" width="100" height="60" rx="10" class="gray"/><text x="90" y="76" class="t-xl t-c">📷</text>
  <line x1="140" y1="76" x2="180" y2="76" class="ln ar"/>
  <ellipse cx="270" cy="76" rx="92" ry="34" class="blue"/>
  <text x="270" y="70" class="t-sm t-c t-b">/v4l2_camera</text><text x="270" y="90" class="t-xs t-c t-mu">드라이버 노드</text>

  <line x1="330" y1="98" x2="420" y2="160" class="ln-green ar-green"/>
  <line x1="350" y1="70" x2="420" y2="60" class="ln-green ar-green"/>
  <line x1="320" y1="104" x2="420" y2="262" class="ln-green ar-green"/>
  <rect x="420" y="40" width="210" height="40" rx="6" class="green"/><text x="525" y="60" class="t-sm t-c t-mono">/image_raw</text>
  <rect x="420" y="140" width="210" height="40" rx="6" class="green"/><text x="525" y="160" class="t-sm t-c t-mono">/image_raw/compressed</text>
  <rect x="420" y="242" width="210" height="40" rx="6" class="green"/><text x="525" y="262" class="t-sm t-c t-mono">/camera_info</text>
  <text x="525" y="100" class="t-xs t-c t-mu">sensor_msgs/Image · 크고 빠름</text>
  <text x="525" y="200" class="t-xs t-c t-mu">CompressedImage (JPEG/PNG) · 무선용</text>
  <text x="525" y="302" class="t-xs t-c t-mu">CameraInfo · 렌즈 보정값 K · D · P</text>

  <line x1="630" y1="60" x2="700" y2="60" class="ln-green ar-green"/>
  <line x1="630" y1="160" x2="700" y2="160" class="ln-green ar-green"/>
  <line x1="630" y1="262" x2="700" y2="262" class="ln-green dash ar-green"/>
  <ellipse cx="780" cy="60" rx="80" ry="30" class="blue"/><text x="780" y="60" class="t-sm t-c">/color_tracker</text>
  <ellipse cx="780" cy="160" rx="80" ry="30" class="blue"/><text x="780" y="154" class="t-sm t-c">원격 PC</text><text x="780" y="172" class="t-xs t-c t-mu">rqt_image_view</text>
  <ellipse cx="780" cy="262" rx="80" ry="30" class="blue"/><text x="780" y="262" class="t-sm t-c">3D 계산 노드</text>
  <rect x="170" y="200" width="200" height="120" rx="12" class="orange"/>
  <text x="270" y="224" class="t-sm t-b t-c t-orange">image_transport</text>
  <text x="270" y="250" class="t-xs t-c">raw · compressed</text>
  <text x="270" y="270" class="t-xs t-c">theora · zstd … (플러그인)</text>
  <text x="270" y="296" class="t-xs t-c t-mu">같은 영상을 여러 형식으로</text>
</svg>`
    },

    /* ---------------------------------------------------------------- cv_bridge */
    cvBridge: {
      caption: 'cv_bridge — ROS 메시지와 OpenCV(numpy) 배열 사이의 통역사. encoding 을 잘못 고르면 빨강과 파랑이 뒤바뀝니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="Image 메시지와 numpy 배열 사이를 cv_bridge 가 변환하는 그림과 bgr8 rgb8 혼동">
  <rect x="30" y="30" width="230" height="130" rx="12" class="green"/>
  <text x="145" y="56" class="t-b t-c t-green">sensor_msgs/Image</text>
  <text x="145" y="86" class="t-xs t-c t-mono">encoding: rgb8</text>
  <text x="145" y="108" class="t-xs t-c t-mono">height 480 · width 640</text>
  <text x="145" y="130" class="t-xs t-c t-mono">data: uint8[921600]</text>

  <rect x="325" y="40" width="230" height="110" rx="12" class="purple"/>
  <text x="440" y="66" class="t-b t-c t-purple">🔁 cv_bridge</text>
  <text x="440" y="96" class="t-xs t-c t-mono">imgmsg_to_cv2(msg, 'bgr8')</text>
  <text x="440" y="124" class="t-xs t-c t-mono">cv2_to_imgmsg(img, 'bgr8')</text>
  <line x1="262" y1="80" x2="322" y2="80" class="ln-purple ar-purple"/>
  <line x1="322" y1="118" x2="262" y2="118" class="ln-purple ar-purple"/>
  <line x1="557" y1="80" x2="617" y2="80" class="ln-purple ar-purple"/>
  <line x1="617" y1="118" x2="557" y2="118" class="ln-purple ar-purple"/>

  <rect x="620" y="30" width="230" height="130" rx="12" class="blue"/>
  <text x="735" y="56" class="t-b t-c t-blue">numpy.ndarray</text>
  <text x="735" y="86" class="t-xs t-c t-mono">shape (480, 640, 3)</text>
  <text x="735" y="108" class="t-xs t-c t-mono">dtype uint8 · 순서 B,G,R</text>
  <text x="735" y="130" class="t-xs t-c">OpenCV 함수가 바로 씀</text>

  <rect x="30" y="190" width="820" height="124" rx="12" class="box"/>
  <text x="50" y="214" class="t-sm t-b t-red">⚠ 함정: rgb8 을 그대로 OpenCV 에 넘기면</text>
  <circle cx="110" cy="266" r="30" class="s-red"/><text x="110" y="304" class="t-xs t-c">실제 빨간 공 (R=255)</text>
  <line x1="160" y1="266" x2="300" y2="266" class="ln-red ar-red"/>
  <text x="230" y="252" class="t-xs t-c t-mono">passthrough</text>
  <circle cx="350" cy="266" r="30" class="s-blue"/><text x="350" y="304" class="t-xs t-c">OpenCV 눈에는 파란 공</text>
  <text x="430" y="248" class="t-sm">OpenCV 는 배열을 <tspan class="t-b">B, G, R</tspan> 순서로 읽습니다.</text>
  <text x="430" y="274" class="t-sm">→ <tspan class="t-mono t-b">desired_encoding='bgr8'</tspan> 을 주면</text>
  <text x="430" y="298" class="t-sm">cv_bridge 가 채널 순서를 알아서 바꿔 줍니다.</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 색 추적 그래프 */
    trackGraph: {
      caption: '색 추적 파이프라인의 rqt_graph — 노드(타원)와 토픽(사각형). 영상은 sensor_data QoS, /target 과 cmd_vel 은 기본 QoS',
      svg: `<svg class="dg" viewBox="0 0 900 300" role="img" aria-label="camera, color_tracker, follower, turtlesim 노드와 image_raw, target, cmd_vel 토픽">
  <ellipse cx="70" cy="110" rx="60" ry="30" class="blue"/><text x="70" y="110" class="t-sm t-c">/camera</text>
  <line x1="130" y1="110" x2="160" y2="110" class="ln ar"/>
  <rect x="160" y="92" width="110" height="36" rx="6" class="green"/><text x="215" y="110" class="t-xs t-c t-mono">/image_raw</text>
  <line x1="270" y1="110" x2="300" y2="110" class="ln ar"/>
  <ellipse cx="375" cy="110" rx="75" ry="32" class="blue"/><text x="375" y="104" class="t-sm t-c">/color_tracker</text><text x="375" y="122" class="t-xs t-c t-mu">cv_bridge + OpenCV</text>
  <line x1="450" y1="110" x2="480" y2="110" class="ln ar"/>
  <rect x="480" y="92" width="90" height="36" rx="6" class="green"/><text x="525" y="110" class="t-xs t-c t-mono">/target</text>
  <line x1="570" y1="110" x2="600" y2="110" class="ln ar"/>
  <ellipse cx="660" cy="110" rx="60" ry="30" class="blue"/><text x="660" y="110" class="t-sm t-c">/follower</text>
  <line x1="660" y1="140" x2="660" y2="180" class="ln ar"/>
  <rect x="580" y="180" width="160" height="36" rx="6" class="green"/><text x="660" y="198" class="t-xs t-c t-mono">/turtle1/cmd_vel</text>
  <line x1="740" y1="198" x2="770" y2="198" class="ln ar"/>
  <ellipse cx="830" cy="198" rx="60" ry="30" class="blue"/><text x="830" y="198" class="t-sm t-c">/turtlesim</text>
  <line x1="375" y1="142" x2="375" y2="180" class="ln dash ar"/>
  <rect x="310" y="180" width="130" height="36" rx="6" class="green"/><text x="375" y="198" class="t-xs t-c t-mono">/image_debug</text>
  <text x="215" y="150" class="t-xs t-c t-orange">BEST_EFFORT</text>
  <text x="215" y="166" class="t-xs t-c t-mu">sensor_msgs/Image</text>
  <text x="525" y="150" class="t-xs t-c t-mu">geometry_msgs/Point</text>
  <text x="525" y="166" class="t-xs t-c t-mu">x: −1~1 · z: 면적</text>
  <text x="660" y="240" class="t-xs t-c t-mu">geometry_msgs/Twist · ω = −k·x</text>
  <rect x="30" y="252" width="840" height="36" rx="8" class="box"/>
  <text x="450" y="270" class="t-xs t-c">감지(Perception) → 판단(Decision) → 행동(Action) — 각 단계를 노드로 나누면 카메라만 바꾸거나 제어기만 바꾸기 쉽습니다</text>
</svg>`
    },

    /* ---------------------------------------------------------------- HSV 단계 */
    hsvFlow: `<div class="flow">
  <div class="fb blue"><span class="fi">🖼️</span><b>BGR 영상</b>imgmsg_to_cv2</div>
  <div class="fb teal"><span class="fi">🎨</span><b>HSV 변환</b>cv2.cvtColor</div>
  <div class="fb orange"><span class="fi">🧪</span><b>inRange</b>색 범위 → 흑백 마스크</div>
  <div class="fb purple"><span class="fi">🧹</span><b>열기(open)</b>점 잡음 제거</div>
  <div class="fb red"><span class="fi">⚖️</span><b>moments</b>무게중심 cx, cy</div>
  <div class="fb green"><span class="fi">📍</span><b>/target 발행</b>geometry_msgs/Point</div>
</div>`,

    /* ---------------------------------------------------------------- YOLO 검출 */
    yoloGraph: {
      caption: '딥러닝 검출 노드 — 결과를 vision_msgs/Detection2DArray 로 발행하면 다른 노드가 “무엇이 · 어디에 · 얼마나 확실하게” 있는지 읽을 수 있습니다',
      svg: `<svg class="dg" viewBox="0 0 900 330" role="img" aria-label="카메라 이미지가 YOLO 검출 노드를 거쳐 Detection2DArray 로 발행되는 그림">
  <ellipse cx="80" cy="90" rx="65" ry="30" class="blue"/><text x="80" y="90" class="t-sm t-c">/camera</text>
  <line x1="145" y1="90" x2="175" y2="90" class="ln ar"/>
  <rect x="175" y="72" width="110" height="36" rx="6" class="green"/><text x="230" y="90" class="t-xs t-c t-mono">/image_raw</text>
  <line x1="285" y1="90" x2="315" y2="90" class="ln ar"/>
  <ellipse cx="400" cy="90" rx="85" ry="34" class="blue"/><text x="400" y="84" class="t-sm t-c t-b">/yolo_detector</text><text x="400" y="102" class="t-xs t-c t-mu">ultralytics YOLO</text>
  <line x1="485" y1="90" x2="515" y2="90" class="ln ar"/>
  <rect x="515" y="72" width="130" height="36" rx="6" class="green"/><text x="580" y="90" class="t-xs t-c t-mono">/detections</text>
  <line x1="645" y1="90" x2="675" y2="90" class="ln ar"/>
  <ellipse cx="760" cy="90" rx="85" ry="30" class="blue"/><text x="760" y="90" class="t-sm t-c">/behavior</text>
  <line x1="400" y1="124" x2="400" y2="160" class="ln dash ar"/>
  <rect x="330" y="160" width="140" height="34" rx="6" class="green"/><text x="400" y="177" class="t-xs t-c t-mono">/annotated</text>

  <rect x="515" y="130" width="360" height="186" rx="12" class="box"/>
  <text x="535" y="152" class="t-xs t-b t-mono">vision_msgs/Detection2DArray</text>
  <text x="535" y="176" class="t-xs t-mono">header</text>
  <text x="535" y="198" class="t-xs t-mono">detections[]  (Detection2D)</text>
  <text x="555" y="220" class="t-xs t-mono">results[].hypothesis.class_id = 'person'</text>
  <text x="555" y="242" class="t-xs t-mono">results[].hypothesis.score = 0.91</text>
  <text x="555" y="264" class="t-xs t-mono">bbox.center.position.x / .y (픽셀)</text>
  <text x="555" y="286" class="t-xs t-mono">bbox.size_x / size_y (픽셀)</text>
  <text x="555" y="306" class="t-xs t-mu">id — 추적(tracking) 번호</text>

  <rect x="40" y="220" width="250" height="96" rx="10" class="gray"/>
  <rect x="70" y="240" width="70" height="60" rx="2" class="nofill ln-red thick"/>
  <text x="105" y="232" class="t-xs t-c t-red">person 0.91</text>
  <rect x="180" y="262" width="80" height="40" rx="2" class="nofill ln-orange thick"/>
  <text x="220" y="254" class="t-xs t-c t-orange">cup 0.77</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 깊이 · 포인트 클라우드 */
    depthFig: {
      caption: '깊이 카메라 → 깊이 이미지(16UC1, mm) + camera_info → depth_image_proc → PointCloud2 (3D 점 구름)',
      svg: `<svg class="dg" viewBox="0 0 900 320" role="img" aria-label="깊이 카메라에서 포인트 클라우드가 만들어지는 과정">
  <rect x="30" y="100" width="120" height="70" rx="12" class="gray"/><text x="90" y="126" class="t-lg t-c">📷📷</text><text x="90" y="154" class="t-xs t-c">RGB-D 카메라</text>
  <line x1="150" y1="120" x2="200" y2="60" class="ln-green ar-green"/>
  <line x1="150" y1="135" x2="200" y2="135" class="ln-green ar-green"/>
  <line x1="150" y1="150" x2="200" y2="210" class="ln-green ar-green"/>
  <rect x="200" y="40" width="220" height="40" rx="6" class="green"/><text x="310" y="60" class="t-xs t-c t-mono">…/color/image_raw (rgb8)</text>
  <rect x="200" y="115" width="220" height="40" rx="6" class="green"/><text x="310" y="135" class="t-xs t-c t-mono">…/depth/image_rect_raw</text>
  <rect x="200" y="190" width="220" height="40" rx="6" class="green"/><text x="310" y="210" class="t-xs t-c t-mono">…/depth/camera_info</text>
  <text x="310" y="170" class="t-xs t-c t-orange">16UC1 = 밀리미터 정수</text>
  <line x1="420" y1="135" x2="470" y2="135" class="ln ar"/>
  <line x1="420" y1="210" x2="470" y2="160" class="ln ar"/>
  <ellipse cx="560" cy="140" rx="90" ry="36" class="blue"/><text x="560" y="132" class="t-sm t-c">depth_image_proc</text><text x="560" y="152" class="t-xs t-c t-mu">point_cloud_xyz</text>
  <line x1="650" y1="140" x2="680" y2="140" class="ln ar"/>
  <rect x="680" y="120" width="190" height="40" rx="6" class="green"/><text x="775" y="140" class="t-xs t-c t-mono">/points (PointCloud2)</text>
  <circle cx="720" cy="210" r="3" class="s-blue"/><circle cx="735" cy="220" r="3" class="s-blue"/><circle cx="752" cy="205" r="3" class="s-teal"/><circle cx="768" cy="226" r="3" class="s-teal"/><circle cx="790" cy="214" r="3" class="s-green"/><circle cx="806" cy="232" r="3" class="s-green"/><circle cx="822" cy="208" r="3" class="s-orange"/><circle cx="840" cy="224" r="3" class="s-orange"/>
  <text x="780" y="256" class="t-xs t-c t-mu">점마다 x, y, z (+ rgb)</text>
  <rect x="30" y="270" width="840" height="36" rx="8" class="box"/>
  <text x="450" y="288" class="t-xs t-c">픽셀 (u, v) 와 깊이 Z → X = (u − cx)·Z / fx,  Y = (v − cy)·Z / fy  (fx, fy, cx, cy 는 camera_info 의 K 행렬)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- LeRobot 흐름 */
    lerobotFlow: {
      caption: '모방학습 한 바퀴 — 사람이 시범 → 데이터셋 → 정책 학습 → 로봇이 스스로 실행. ROS 2 는 센서 · 관절 토픽을 모으고 정책의 출력을 로봇에 전달하는 배관 역할',
      svg: `<svg class="dg" viewBox="0 0 900 320" role="img" aria-label="리더 암 시범, 데이터셋, 학습, 추론, ROS 2 브릿지로 이어지는 모방학습 흐름">
  <rect x="20" y="40" width="160" height="110" rx="12" class="orange"/>
  <text x="100" y="66" class="t-b t-c t-orange">① 시범 (텔레옵)</text>
  <text x="100" y="98" class="t-xl t-c">🦾🤝🦾</text>
  <text x="100" y="130" class="t-xs t-c">리더 암 → 팔로워 암</text>
  <line x1="180" y1="95" x2="220" y2="95" class="ln ar"/>
  <rect x="220" y="40" width="160" height="110" rx="12" class="teal"/>
  <text x="300" y="66" class="t-b t-c t-teal">② 데이터셋</text>
  <text x="300" y="96" class="t-xs t-c">카메라 영상 + 관절값</text>
  <text x="300" y="116" class="t-xs t-c">+ 행동(action)</text>
  <text x="300" y="136" class="t-xs t-c t-mono">lerobot-record</text>
  <line x1="380" y1="95" x2="420" y2="95" class="ln ar"/>
  <rect x="420" y="40" width="180" height="110" rx="12" class="purple"/>
  <text x="510" y="66" class="t-b t-c t-purple">③ 정책 학습</text>
  <text x="510" y="94" class="t-xs t-c">ACT · Diffusion Policy</text>
  <text x="510" y="114" class="t-xs t-c">SmolVLA (언어 지시)</text>
  <text x="510" y="136" class="t-xs t-c t-mono">lerobot-train</text>
  <line x1="600" y1="95" x2="640" y2="95" class="ln ar"/>
  <rect x="640" y="40" width="240" height="110" rx="12" class="green"/>
  <text x="760" y="66" class="t-b t-c t-green">④ 추론 · 실행</text>
  <text x="760" y="94" class="t-xs t-c">관측 → 정책 → 다음 관절 목표</text>
  <text x="760" y="114" class="t-xs t-c">초당 수십 번 반복</text>
  <text x="760" y="136" class="t-xs t-c t-mono">lerobot-rollout</text>

  <rect x="20" y="190" width="860" height="110" rx="12" class="blue"/>
  <text x="450" y="214" class="t-b t-c t-blue">ROS 2 와 만나는 지점 (LeRobot ↔ ROS 2 브릿지)</text>
  <ellipse cx="130" cy="262" rx="95" ry="26" class="box"/><text x="130" y="262" class="t-xs t-c">카메라 드라이버</text>
  <rect x="245" y="246" width="150" height="32" rx="6" class="green"/><text x="320" y="262" class="t-xs t-c t-mono">/image_raw</text>
  <ellipse cx="480" cy="262" rx="70" ry="26" class="box"/><text x="480" y="262" class="t-xs t-c">정책 노드</text>
  <rect x="565" y="246" width="190" height="32" rx="6" class="green"/><text x="660" y="262" class="t-xs t-c t-mono">joint_trajectory</text>
  <ellipse cx="820" cy="262" rx="52" ry="26" class="box"/><text x="820" y="262" class="t-xs t-c">ros2_control</text>
  <line x1="225" y1="262" x2="245" y2="262" class="ln ar"/><line x1="395" y1="262" x2="410" y2="262" class="ln ar"/><line x1="550" y1="262" x2="565" y2="262" class="ln ar"/><line x1="755" y1="262" x2="768" y2="262" class="ln ar"/>
</svg>`
    }
  },

  sections: [
    /* ============================================================ 1 */
    {
      title: '로봇의 눈 — 이미지는 ROS 2 에서 어떤 모양일까?',
      html: `
<p>사진 한 장은 사람에게는 “빨간 공이 있는 방”이지만, 컴퓨터에게는 <b>숫자가 촘촘히 늘어선 표</b>일 뿐입니다. 픽셀 하나가 빨강(R) · 초록(G) · 파랑(B) 세 숫자(각 0~255)를 가지고, 그런 픽셀이 가로 640개 × 세로 480개 모여 있는 식이지요.</p>
<p>ROS 2 는 이 표를 <code>sensor_msgs/msg/Image</code> 메시지 하나에 담아 토픽으로 보냅니다. 핵심은 <b>2차원 표를 1차원 바이트 배열(data)로 펼쳐 놓고</b>, 다시 접는 방법을 옆에 적어 두는 것입니다.</p>
{{fig:imageMsg}}
<table class="tbl">
<tr><th>필드</th><th>뜻</th><th>예 (640×480 컬러)</th></tr>
<tr><td><code>height</code> / <code>width</code></td><td>세로(행 수) / 가로(열 수) 픽셀</td><td>480 / 640</td></tr>
<tr><td><code>encoding</code></td><td>한 픽셀을 어떤 숫자로 적었는지</td><td><code>rgb8</code> (채널 3개 × 8비트)</td></tr>
<tr><td><code>step</code></td><td>한 행이 차지하는 바이트 수 (= width × 픽셀당 바이트, 끝에 여분이 붙을 수도)</td><td>640 × 3 = 1920</td></tr>
<tr><td><code>data</code></td><td>행을 위에서부터 이어 붙인 바이트 배열 (길이 = step × height)</td><td>921,600 바이트</td></tr>
</table>
<table class="tbl cmp">
<tr><th>encoding</th><th>픽셀 하나</th><th>주로 쓰는 곳</th></tr>
<tr><td><code>rgb8</code> / <code>bgr8</code></td><td>8비트 × 3채널 (순서만 다름)</td><td>일반 컬러 카메라. OpenCV 는 <b>bgr8</b> 순서</td></tr>
<tr><td><code>mono8</code></td><td>8비트 × 1채널 (밝기)</td><td>흑백 카메라, 마스크 이미지</td></tr>
<tr><td><code>16UC1</code></td><td>부호 없는 16비트 × 1채널</td><td>깊이 이미지 — 값이 <b>밀리미터</b></td></tr>
<tr><td><code>32FC1</code></td><td>32비트 실수 × 1채널</td><td>깊이 이미지 — 값이 <b>미터</b></td></tr>
</table>
<div class="cards c2">
  <div class="card teal"><div class="ci">🗜️</div><b>sensor_msgs/CompressedImage</b><p><code>header</code> · <code>format</code>(예: <code>"jpeg"</code>) · <code>data</code>(압축된 바이트). 폭 · 높이 필드가 없고, 받는 쪽이 풀어서 씁니다. Wi-Fi 로 영상을 보낼 때 대역폭을 10분의 1 이하로 줄여 줍니다.</p></div>
  <div class="card purple"><div class="ci">📐</div><b>sensor_msgs/CameraInfo</b><p>렌즈의 성질: 내부 행렬 <code>k</code>(fx, fy, cx, cy), 왜곡 계수 <code>d</code>, 투영 행렬 <code>p</code>, <code>distortion_model</code>(보통 <code>plumb_bob</code>). 픽셀을 실제 각도 · 거리로 바꿀 때 필요합니다.</p></div>
</div>
<p>터미널에서 메시지 정의를 직접 확인해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 interface show sensor_msgs/msg/Image</code></pre>
{{widget:term|chips=ros2 interface show sensor_msgs/msg/Image;ros2 interface list -m|h=260}}
<div class="box tip"><div class="box-t">💡 왜 크기가 중요할까?</div>640×480 rgb8 한 장이 약 0.9 MB 이므로 30 fps 면 초당 약 27 MB 입니다. 같은 PC 안에서는 괜찮지만 Wi-Fi 로 원격 PC 에 보내면 금방 막힙니다. 그래서 다음 절의 <b>압축 전송(image_transport)</b>과 <b>QoS</b> 가 필요합니다.</div>`
    },

    /* ============================================================ 2 */
    {
      title: '카메라 드라이버 · image_transport · QoS',
      html: `
<p>실제 카메라를 ROS 2 에 연결하는 일은 <b>드라이버 노드</b>가 합니다. 드라이버는 카메라에서 프레임을 받아 <code>Image</code> 와 <code>CameraInfo</code> 로 발행할 뿐, 영상을 해석하지는 않습니다. 해석은 다른 노드의 몫입니다.</p>
<table class="tbl">
<tr><th>패키지 (apt: ros-jazzy-…)</th><th>대상</th><th>실행 예</th></tr>
<tr><td><code>v4l2_camera</code></td><td>리눅스 V4L2 USB 웹캠 · 라즈베리파이 카메라</td><td><code>ros2 run v4l2_camera v4l2_camera_node</code></td></tr>
<tr><td><code>usb_cam</code></td><td>USB 웹캠 (MJPEG · YUYV 등)</td><td><code>ros2 run usb_cam usb_cam_node_exe</code></td></tr>
<tr><td><code>realsense2_camera</code></td><td>Intel RealSense D4xx 깊이 카메라</td><td><code>ros2 launch realsense2_camera rs_launch.py</code></td></tr>
</table>
<pre class="code" data-lang="bash"><code><span class="cm"># 실제 Ubuntu 24.04 + Jazzy 에서 (브라우저 실습에서는 필요 없음)</span>
sudo apt install ros-jazzy-v4l2-camera ros-jazzy-usb-cam ros-jazzy-realsense2-camera \\
                 ros-jazzy-cv-bridge ros-jazzy-image-transport-plugins ros-jazzy-rqt-image-view
ros2 run v4l2_camera v4l2_camera_node --ros-args -p image_size:="[640,480]"
ros2 run rqt_image_view rqt_image_view /image_raw</code></pre>
{{fig:camPipe}}
<h3>image_transport — 같은 영상, 여러 형식</h3>
<p><code>image_transport</code> 를 쓰는 드라이버는 <code>/image_raw</code> 하나만 발행하는 게 아니라, 설치된 <b>플러그인</b>마다 하위 토픽을 함께 만듭니다. <code>/image_raw/compressed</code>(JPEG · PNG), <code>/image_raw/theora</code>(동영상 코덱), 최근의 <code>/image_raw/zstd</code> 등입니다. 받는 쪽도 image_transport 로 구독하면 <b>“compressed 로 받아서 풀어 줘”</b>라고 고르기만 하면 됩니다.</p>
<pre class="code" data-lang="bash"><code><span class="cm"># raw 만 발행하는 노드의 영상을 compressed 로 다시 발행 (Jazzy 방식: 파라미터로 형식 지정)</span>
ros2 run image_transport republish --ros-args \\
  -p in_transport:=raw -p out_transport:=compressed \\
  -r in:=/image_raw -r out/compressed:=/image_raw/compressed
<span class="cm"># 어떤 플러그인이 설치되어 있는지</span>
ros2 run image_transport list_transports</code></pre>
<h3>영상에는 sensor_data QoS</h3>
<p>11장에서 배운 QoS 를 떠올려 보세요. 카메라 드라이버는 대부분 <b>BEST_EFFORT</b>(<code>qos_profile_sensor_data</code>) 로 발행합니다. 영상은 한 장 잃어도 곧 다음 장이 오니, 늦게 도착한 옛 프레임을 다시 보내느라 지연되는 것보다 버리는 편이 낫기 때문입니다.</p>
<div class="vs">
  <div class="vs-a blue"><b>RELIABLE (기본값)</b><ul><li>빠진 메시지를 다시 보냄</li><li>명령 · 상태 · 지도에 적합</li><li>무선에서 큰 영상이면 지연이 쌓임</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b orange"><b>BEST_EFFORT (sensor_data)</b><ul><li>빠지면 그냥 버림</li><li>카메라 · LiDAR · IMU 에 적합</li><li>RELIABLE 구독자와는 <b>연결 안 됨</b></li></ul></div>
</div>
<div class="box warn"><div class="box-t">⚠️ “토픽은 보이는데 영상이 안 와요”</div>BEST_EFFORT 로 발행하는 카메라를 RELIABLE 구독자가 받으면 QoS 가 호환되지 않아 <b>한 장도</b> 오지 않습니다. 영상 구독 노드는 <code>qos_profile_sensor_data</code> 로 구독하세요. <code>ros2 topic info /image_raw -v</code> 로 양쪽 QoS 를 비교할 수 있습니다 (4절에서 직접 확인).</div>
<h3>카메라 보정 (Calibration)</h3>
<p>렌즈는 가장자리를 휘게 찍습니다. 체커보드를 여러 각도로 비추며 <code>camera_calibration</code> 을 돌리면 <code>k</code> · <code>d</code> 값을 계산해 YAML 로 저장해 주고, 드라이버가 그 파일을 읽어 <code>/camera_info</code> 로 발행합니다.</p>
<pre class="code" data-lang="bash"><code>sudo apt install ros-jazzy-camera-calibration
<span class="cm"># 8x6 = 체커보드 안쪽 모서리 개수, 0.025 = 한 칸 한 변(m)</span>
ros2 run camera_calibration cameracalibrator --size 8x6 --square 0.025 \\
  --ros-args -r image:=/image_raw -p camera:=/camera</code></pre>`
    },

    /* ============================================================ 3 */
    {
      title: 'cv_bridge — ROS 이미지 ⇄ OpenCV 배열',
      html: `
<p>OpenCV 함수(<code>cv2.cvtColor</code>, <code>cv2.inRange</code> …)는 <code>Image</code> 메시지를 모릅니다. 파이썬에서는 <b>numpy 배열</b>을 받지요. 둘 사이를 옮겨 주는 통역사가 <code>cv_bridge</code> 입니다.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 택배 상자와 주방</div>ROS 토픽으로 오는 이미지는 <b>택배 상자</b>(송장: 크기 · 인코딩 + 내용물: 바이트)입니다. 요리(영상 처리)를 하려면 상자를 뜯어 <b>도마 위에 재료를 펼쳐야</b> 하죠. cv_bridge 는 상자를 뜯어 도마(numpy)에 올려 주고, 요리가 끝나면 다시 포장해 주는 사람입니다.</div>
{{fig:cvBridge}}
<pre class="code" data-lang="python"><code>from cv_bridge import CvBridge
bridge = CvBridge()

<span class="cm"># ROS → OpenCV : 원하는 인코딩을 꼭 적기 (OpenCV 는 BGR 순서)</span>
frame = bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')     <span class="cm"># shape (H, W, 3)</span>
depth = bridge.imgmsg_to_cv2(depth_msg, desired_encoding='passthrough')  <span class="cm"># 16UC1 그대로 (mm)</span>

<span class="cm"># OpenCV → ROS : header 를 원본에서 복사해야 시간 · 좌표계가 이어짐</span>
out = bridge.cv2_to_imgmsg(frame, encoding='bgr8')
out.header = msg.header

<span class="cm"># 압축 이미지</span>
frame = bridge.compressed_imgmsg_to_cv2(cmsg, desired_encoding='bgr8')</code></pre>
<table class="tbl">
<tr><th>상황</th><th>desired_encoding</th><th>이유</th></tr>
<tr><td>컬러 영상을 OpenCV 로 처리</td><td><code>'bgr8'</code></td><td>카메라가 rgb8 로 보내도 cv_bridge 가 채널 순서를 바꿔 줌</td></tr>
<tr><td>흑백 처리 (에지 · 특징점)</td><td><code>'mono8'</code></td><td>컬러를 밝기로 변환해 줌</td></tr>
<tr><td>깊이 이미지</td><td><code>'passthrough'</code></td><td>16UC1(mm) · 32FC1(m) 값을 바꾸지 않고 그대로</td></tr>
<tr><td>마스크를 발행</td><td><code>cv2_to_imgmsg(mask, 'mono8')</code></td><td>채널 1개 · 0/255 값</td></tr>
</table>
<div class="box warn"><div class="box-t">⚠️ bgr8 · rgb8 함정 — 가장 흔한 비전 버그</div>
<ul>
<li><code>passthrough</code> 로 받은 rgb8 영상을 그대로 <code>cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)</code> 에 넣으면 빨강과 파랑이 뒤바뀌어 <b>빨간 공 대신 파란 공을 쫓는</b> 로봇이 됩니다.</li>
<li>반대로 OpenCV 결과(BGR)를 <code>encoding='rgb8'</code> 로 포장하면 rqt_image_view 에서 사람 얼굴이 파랗게 보입니다.</li>
<li>확인법: <code>ros2 topic echo /image_raw --field encoding</code> 으로 실제 인코딩을 보고, 받을 때는 항상 <code>desired_encoding</code> 을 명시하세요.</li>
</ul></div>
<div class="box note"><div class="box-t">📌 설치 · 버전 메모</div>Jazzy 에서는 <code>sudo apt install ros-jazzy-cv-bridge python3-opencv</code> 로 설치합니다. pip 으로 다른 버전의 numpy/OpenCV 를 설치하면 cv_bridge 와 충돌할 수 있으니, 딥러닝 패키지는 <b>가상환경(<code>python3 -m venv --system-site-packages</code>)</b> 에 따로 넣는 것이 안전합니다.</div>`
    },

    /* ============================================================ 4 */
    {
      title: '실습 — 색 추적 노드로 거북이 조종하기',
      html: `
<p>이제 “보고 → 판단하고 → 움직이는” 가장 작은 비전 로봇을 만들어 봅니다. 카메라가 영상을 발행하면, <code>/color_tracker</code> 노드가 특정 색 덩어리의 위치를 찾아 <code>/target</code> 으로 알리고, <code>/follower</code> 노드가 그 위치를 보고 거북이를 회전시킵니다.</p>
{{fig:trackGraph}}
<p><code>/color_tracker</code> 안에서 일어나는 일은 다음 여섯 단계입니다. HSV(색상 Hue · 채도 Saturation · 명도 Value)로 바꾸는 이유는, RGB 는 조명이 밝아지면 세 값이 모두 변하지만 HSV 의 <b>H(색상)</b> 는 거의 그대로이기 때문입니다.</p>
{{fig:hsvFlow}}
<div class="box note"><div class="box-t">📌 OpenCV 의 HSV 범위</div>OpenCV 는 H 를 <b>0~179</b>(각도 ÷ 2), S · V 를 0~255 로 씁니다. 빨강은 H 가 0 근처와 179 근처에 걸쳐 있어서 두 구간을 합쳐야 합니다(아래 위젯은 <code>h_low &gt; h_high</code> 이면 자동으로 두 구간으로 봅니다).</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — 빨간 공을 쫓는 거북이</div>
<ol class="steps-list">
<li><b>그래프 확인</b> — 아래 실습 창의 터미널에서 <code>ros2 node list</code> 를 실행해 <code>/camera</code> · <code>/color_tracker</code> · <code>/follower</code> · <code>/turtlesim</code> 이 있는지 봅니다.</li>
<li><b>공 옮기기</b> — 비전 위젯의 ① 원본 패널에서 빨간 공을 마우스로 끌어 왼쪽 · 오른쪽으로 옮기고, 거북이가 그쪽으로 도는지 봅니다. (📷 웹캠 버튼으로 실제 카메라를 써도 됩니다. 영상은 브라우저 밖으로 나가지 않습니다.)</li>
<li><b>색 바꾸기</b> — 초록 · 파랑 프리셋을 누르거나 H 슬라이더를 움직여 ② 마스크가 어떻게 바뀌는지 관찰합니다.</li>
<li><b>명령으로 조정</b> — 아래 코드 블록으로 <code>/target</code> 을 echo 하고, <code>ros2 param set</code> 으로 범위를 바꾸면 슬라이더도 따라 움직입니다.</li>
</ol></div>
{{widget:vision|follow=turtle|color=red}}
{{widget:lab|with=turtlesim|title=실습 — 터미널 + turtlesim (비전 위젯의 /follower 가 거북이를 돌립니다)|h=360}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 topic list -t</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic info /image_raw -v</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic hz /image_raw</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /target</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param list /color_tracker
ros2 param set /color_tracker h_low 35
ros2 param set /color_tracker h_high 85</code></pre>
<p>마지막 블록은 추적 색을 <b>초록</b>(H 35~85)으로 바꿉니다. 초록 공을 끌어 보세요. 다시 빨강으로 돌리려면 위젯의 빨강 프리셋을 누르면 됩니다.</p>
<div class="box tip"><div class="box-t">💡 영상 토픽을 echo 해 보기</div>
<code>ros2 topic echo /image_raw --qos-reliability best_effort --no-arr --once</code> 를 실행하면 data 배열을 생략하고 height · width · encoding · step 만 볼 수 있습니다. <code>--qos-reliability best_effort</code> 를 빼고 RELIABLE 로 구독하면 이 브라우저 실습에서는 QoS 불일치 경고가 뜹니다. (실제 Jazzy 의 <code>ros2 topic echo</code> 는 발행자 QoS 에 맞춰 자동으로 고르기도 하지만, 직접 짠 노드는 그렇지 않습니다.)</div>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /image_raw --qos-reliability best_effort --no-arr --once</code></pre>`
    },

    /* ============================================================ 5 */
    {
      title: '코드 읽기 — rclpy + cv_bridge + OpenCV 노드 전체',
      html: `
<p>위젯 안에서 돌던 <code>/color_tracker</code> 를 실제 로봇에서 쓰려면 아래 파이썬 노드 하나면 됩니다. OpenCV 는 이 브라우저 실행기에서 쓸 수 없으므로 <b>읽기 전용</b>으로 보고, 실제 Ubuntu 에서는 7장 방식으로 패키지를 만들어 실행합니다.</p>
<pre class="code" data-lang="python"><code>import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image
from geometry_msgs.msg import Point
from cv_bridge import CvBridge


class ColorTracker(Node):
    def __init__(self):
        super().__init__('color_tracker')
        <span class="cm"># HSV 범위와 최소 면적을 파라미터로 → ros2 param set 으로 현장에서 조정</span>
        for name, val in [('h_low', 170), ('h_high', 10), ('s_low', 120), ('s_high', 255),
                          ('v_low', 70), ('v_high', 255), ('min_area', 30)]:
            self.declare_parameter(name, val)
        self.bridge = CvBridge()
        self.sub = self.create_subscription(Image, 'image_raw', self.on_image, qos_profile_sensor_data)
        self.pub_target = self.create_publisher(Point, 'target', 10)
        self.pub_debug = self.create_publisher(Image, 'image_debug', 10)

    def p(self, name):
        return self.get_parameter(name).value

    def on_image(self, msg):
        frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')   <span class="cm"># ① ROS → numpy (BGR)</span>
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)                        <span class="cm"># ② HSV</span>
        lo_s, hi_s, lo_v, hi_v = self.p('s_low'), self.p('s_high'), self.p('v_low'), self.p('v_high')
        h_lo, h_hi = self.p('h_low'), self.p('h_high')
        if h_lo &lt;= h_hi:                                                    <span class="cm"># ③ inRange</span>
            mask = cv2.inRange(hsv, (h_lo, lo_s, lo_v), (h_hi, hi_s, hi_v))
        else:                                                                <span class="cm"># 빨강: 0 / 180 경계를 넘는 두 구간</span>
            mask = cv2.inRange(hsv, (h_lo, lo_s, lo_v), (179, hi_s, hi_v)) | \\
                   cv2.inRange(hsv, (0, lo_s, lo_v), (h_hi, hi_s, hi_v))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))   <span class="cm"># ④ 잡음 제거</span>

        dbg = self.bridge.cv2_to_imgmsg(mask, encoding='mono8')
        dbg.header = msg.header
        self.pub_debug.publish(dbg)

        m = cv2.moments(mask, binaryImage=True)                              <span class="cm"># ⑤ 무게중심</span>
        area = m['m00']
        if area &lt; self.p('min_area'):
            return                                                           <span class="cm"># 못 찾으면 발행하지 않음</span>
        cx, cy = m['m10'] / area, m['m01'] / area
        h, w = mask.shape
        target = Point()                                                     <span class="cm"># ⑥ 정규화 좌표로 발행</span>
        target.x = (cx - w / 2) / (w / 2)       <span class="cm"># −1(왼쪽) ~ +1(오른쪽)</span>
        target.y = (cy - h / 2) / (h / 2)       <span class="cm"># −1(위) ~ +1(아래)</span>
        target.z = area / (w * h)               <span class="cm"># 화면에서 차지하는 비율 ≈ 가까움</span>
        self.pub_target.publish(target)


def main():
    rclpy.init()
    node = ColorTracker()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.try_shutdown()


if __name__ == '__main__':
    main()</code></pre>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 왜 픽셀이 아니라 −1 ~ +1 로 보낼까?</div>카메라 해상도가 640 이든 1920 이든 <code>/target</code> 을 받는 제어 노드는 바꿀 필요가 없습니다. 인터페이스를 <b>해상도와 무관하게</b> 설계하면 카메라 교체 · 시뮬레이터 전환이 쉬워집니다. 더 정확히 하려면 camera_info 로 픽셀을 <b>각도(rad)</b>로 바꿔 보내면 됩니다.</div>
<h3>제어 쪽은 브라우저에서 직접 실행!</h3>
<p><code>/target</code> 을 받아 거북이를 돌리는 쪽은 OpenCV 가 필요 없으니 파이썬 실습기에서 실제 rclpy 로 돌려 볼 수 있습니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 내가 만든 follower</div>
<ol class="steps-list">
<li>4절 비전 위젯에서 <b>🐢 /follower 노드</b> 체크를 끕니다 (두 노드가 같은 cmd_vel 로 동시에 명령하지 않도록).</li>
<li>아래 실습기의 <b>▶ 실행</b>을 누르고, 빨간 공을 옮겨 거북이가 도는지 봅니다.</li>
<li><code>gain</code> 을 0.5 · 5.0 으로 바꿔 보세요 (<code>ros2 param set /target_follower gain 5.0</code>). 너무 크면 좌우로 흔들립니다(진동).</li>
</ol></div>
{{widget:pylab|ex=follow_target|with=turtlesim}}
<p>한 걸음 더 — 공이 화면 가운데에 있으면 <b>앞으로 다가가고</b>, 충분히 커지면(가까워지면) 멈추며, 공을 놓치면 0.5초 뒤 정지하는 제어기입니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import time
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Point, Twist


class Approach(Node):
    """/target 의 x(좌우)로 방향을, z(면적)로 거리를 판단합니다."""
    def __init__(self):
        super().__init__('target_approach')
        self.declare_parameter('k_ang', 2.5)
        self.declare_parameter('goal_area', 0.08)
        self.create_subscription(Point, '/target', self.on_target, 10)
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.last = 0.0
        self.create_timer(0.2, self.watchdog)

    def on_target(self, p):
        self.last = time.monotonic()
        k = self.get_parameter('k_ang').value
        goal = self.get_parameter('goal_area').value
        cmd = Twist()
        cmd.angular.z = -k * p.x                      # 오른쪽(+)에 있으면 오른쪽(-)으로
        if abs(p.x) &lt; 0.3 and p.z &lt; goal:
            cmd.linear.x = 1.5 * (goal - p.z) / goal  # 멀수록(작을수록) 빠르게
        self.pub.publish(cmd)

    def watchdog(self):
        if self.last and time.monotonic() - self.last &gt; 0.5:
            self.get_logger().info('목표를 놓쳤습니다 → 정지', throttle_duration_sec=2.0)
            self.pub.publish(Twist())


def main():
    rclpy.init()
    rclpy.spin(Approach())


if __name__ == '__main__':
    main()</code></pre>`
    },

    /* ============================================================ 6 */
    {
      title: '객체 검출 — YOLO 노드와 vision_msgs',
      html: `
<p>색 추적은 “빨간 것”만 찾습니다. “사람”, “컵”, “의자”처럼 <b>물체의 종류</b>를 알아보려면 딥러닝 검출기가 필요합니다. 가장 널리 쓰이는 것이 Ultralytics 의 <b>YOLO</b>(You Only Look Once) 계열로, 이미지 한 장을 한 번에 보고 상자 · 종류 · 확신도를 동시에 냅니다.</p>
{{fig:yoloGraph}}
<p>검출 결과는 <code>vision_msgs</code> 패키지의 표준 메시지로 발행하는 것이 좋습니다. 그래야 RViz 플러그인, 추적기, 행동 노드 등 <b>다른 사람이 만든 노드와 바로 연결</b>됩니다.</p>
<table class="tbl">
<tr><th>메시지</th><th>담는 것</th></tr>
<tr><td><code>vision_msgs/Detection2DArray</code></td><td>한 프레임의 모든 검출 (<code>header</code> + <code>detections[]</code>)</td></tr>
<tr><td><code>vision_msgs/Detection2D</code></td><td>검출 하나: <code>results[]</code>(후보 종류들) · <code>bbox</code> · <code>id</code></td></tr>
<tr><td><code>vision_msgs/ObjectHypothesisWithPose</code></td><td><code>hypothesis.class_id</code>(문자열) · <code>hypothesis.score</code> · <code>pose</code></td></tr>
<tr><td><code>vision_msgs/BoundingBox2D</code></td><td><code>center</code>(position.x · y, theta) · <code>size_x</code> · <code>size_y</code></td></tr>
<tr><td><code>vision_msgs/Detection3DArray</code></td><td>깊이까지 쓴 3D 상자 검출</td></tr>
</table>
<pre class="code" data-lang="python"><code><span class="cm"># yolo_detector.py — 실제 PC 용 (pip install ultralytics, GPU 권장)</span>
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image
from vision_msgs.msg import Detection2DArray, Detection2D, ObjectHypothesisWithPose
from cv_bridge import CvBridge
from ultralytics import YOLO


class YoloDetector(Node):
    def __init__(self):
        super().__init__('yolo_detector')
        self.declare_parameter('model', 'yolo11n.pt')      <span class="cm"># n = nano, 가장 가벼운 모델</span>
        self.declare_parameter('conf', 0.5)
        self.model = YOLO(self.get_parameter('model').value)
        self.bridge = CvBridge()
        self.create_subscription(Image, 'image_raw', self.on_image, qos_profile_sensor_data)
        self.pub = self.create_publisher(Detection2DArray, 'detections', 10)
        self.pub_img = self.create_publisher(Image, 'annotated', 10)

    def on_image(self, msg):
        frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
        r = self.model(frame, conf=self.get_parameter('conf').value, verbose=False)[0]
        out = Detection2DArray(header=msg.header)
        for xywh, cls, score in zip(r.boxes.xywh.tolist(), r.boxes.cls.tolist(), r.boxes.conf.tolist()):
            d = Detection2D(header=msg.header)
            d.bbox.center.position.x, d.bbox.center.position.y = xywh[0], xywh[1]
            d.bbox.size_x, d.bbox.size_y = xywh[2], xywh[3]
            h = ObjectHypothesisWithPose()
            h.hypothesis.class_id = r.names[int(cls)]           <span class="cm"># 'person', 'cup' …</span>
            h.hypothesis.score = float(score)
            d.results.append(h)
            out.detections.append(d)
        self.pub.publish(out)
        img = self.bridge.cv2_to_imgmsg(r.plot(), encoding='bgr8')   <span class="cm"># 상자를 그린 영상</span>
        img.header = msg.header
        self.pub_img.publish(img)


def main():
    rclpy.init()
    rclpy.spin(YoloDetector())


if __name__ == '__main__':
    main()</code></pre>
<div class="box note"><div class="box-t">📌 설치 메모</div><code>sudo apt install ros-jazzy-vision-msgs</code> 로 메시지를, 가상환경에서 <code>pip install ultralytics</code> 로 검출기를 설치합니다. Ultralytics 는 <a href="https://docs.ultralytics.com/guides/ros-quickstart/" target="_blank" rel="noopener">ROS 빠른 시작 가이드</a>를 제공하고, <code>yolo_ros</code> 같은 완성된 ROS 2 래퍼 패키지도 있습니다. YOLO 모델 이름(yolo11n 등)은 새 버전이 계속 나오므로 문서에서 최신 이름을 확인하세요.</div>
<p>검출 결과를 받는 쪽은 평범한 rclpy 노드입니다. 아래는 이 페이지의 <code>/target</code> 을 “검출 결과”로 보고, 위치 · 거리를 사람이 읽을 수 있는 문장으로 바꿔 <code>/target_state</code> 로 발행하는 노드입니다. 실행한 뒤 터미널에서 <code>ros2 topic echo /target_state</code> 로 확인해 보세요.</p>
<pre class="code" data-lang="python" data-run="py" data-with="graph"><code>import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Point
from std_msgs.msg import String


class TargetMonitor(Node):
    def __init__(self):
        super().__init__('target_monitor')
        self.create_subscription(Point, '/target', self.on_target, 10)
        self.pub = self.create_publisher(String, '/target_state', 10)

    def on_target(self, p):
        side = '왼쪽' if p.x &lt; -0.2 else ('오른쪽' if p.x &gt; 0.2 else '정면')
        dist = '가까움' if p.z &gt; 0.05 else '멂'
        text = f'목표: {side} ({p.x:+.2f}), 거리 {dist} (면적 {p.z:.3f})'
        self.pub.publish(String(data=text))
        self.get_logger().info(text, throttle_duration_sec=1.0)


def main():
    rclpy.init()
    rclpy.spin(TargetMonitor())


if __name__ == '__main__':
    main()</code></pre>`
    },

    /* ============================================================ 7 */
    {
      title: '깊이 카메라와 포인트 클라우드',
      html: `
<p>일반 카메라는 “어느 <b>방향</b>에 있는가”만 알려 줍니다. 로봇팔이 컵을 잡거나 로봇이 계단을 피하려면 “<b>얼마나 멀리</b>”도 알아야 하죠. RealSense · ZED · OAK-D 같은 <b>RGB-D(깊이) 카메라</b>는 픽셀마다 거리 값을 담은 깊이 이미지를 함께 줍니다.</p>
{{fig:depthFig}}
<div class="cards c3">
  <div class="card blue"><div class="ci">🟦</div><b>깊이 이미지</b><p><code>sensor_msgs/Image</code> + encoding <code>16UC1</code>(mm) 또는 <code>32FC1</code>(m). 0 이나 NaN 은 “측정 실패”.</p></div>
  <div class="card teal"><div class="ci">☁️</div><b>포인트 클라우드</b><p><code>sensor_msgs/PointCloud2</code>: <code>fields</code>(x · y · z · rgb 배치), <code>point_step</code>, <code>row_step</code>, <code>data</code>, <code>is_dense</code>.</p></div>
  <div class="card orange"><div class="ci">🧮</div><b>depth_image_proc</b><p>깊이 이미지 + camera_info → PointCloud2 (<code>point_cloud_xyz</code>), 컬러까지 (<code>point_cloud_xyzrgb</code>), 컬러 좌표계 정렬(<code>register</code>).</p></div>
</div>
<pre class="code" data-lang="bash"><code><span class="cm"># RealSense: 깊이를 컬러에 맞춰 정렬하고 포인트 클라우드까지 켜기</span>
ros2 launch realsense2_camera rs_launch.py align_depth.enable:=true pointcloud.enable:=true
<span class="cm"># 토픽 예 (드라이버 4.5x 기준, 기본 namespace 가 /camera/camera)</span>
<span class="cm">#   /camera/camera/color/image_raw  /camera/camera/depth/image_rect_raw  /camera/camera/depth/color/points</span>
ros2 run rviz2 rviz2    <span class="cm"># Add → PointCloud2 → Topic 선택, Fixed Frame = camera_link</span></code></pre>
<div class="box tip"><div class="box-t">💡 무거운 데이터는 가볍게</div>
<ul>
<li>640×480 포인트 클라우드는 한 장에 30만 점 · 수 MB 입니다. Nav2 장애물 감지에는 <code>pointcloud_to_laserscan</code> 으로 <b>2D 스캔으로 줄이거나</b>, voxel(격자) 다운샘플링을 씁니다.</li>
<li>같은 프로세스 안에서 노드를 <b>컴포넌트(composable node)</b> 로 묶으면 큰 메시지를 복사하지 않고 넘길 수 있습니다(인트라 프로세스 통신).</li>
</ul></div>
<p>검출과 깊이를 합치면 “컵이 카메라 앞 0.42 m 에 있다” → TF 로 로봇팔 기준 좌표로 바꾼다(12장) → MoveIt 으로 잡는다(17장)는 파이프라인이 완성됩니다.</p>`
    },

    /* ============================================================ 8 */
    {
      title: 'AI 동향 — LeRobot 모방학습 · VLA · Isaac ROS',
      html: `
<p>지금까지는 사람이 규칙(HSV 범위, 비례 제어)을 직접 짰습니다. 요즘 로봇 AI 의 큰 흐름은 <b>사람의 시범을 보여 주고 신경망이 규칙을 배우게 하는</b> 것입니다. 이것을 <b>모방학습(imitation learning)</b>이라고 합니다.</p>
{{fig:lerobotFlow}}
<h3>LeRobot — Hugging Face 의 로봇 학습 라이브러리</h3>
<p><a href="https://github.com/huggingface/lerobot" target="_blank" rel="noopener">LeRobot</a> 은 저렴한 SO-ARM101 같은 팔로 데이터를 모으고, 정책을 학습하고, 로봇에서 실행하는 전 과정을 명령 몇 개로 묶어 둔 오픈소스 라이브러리입니다.</p>
<pre class="code" data-lang="bash"><code><span class="cm"># ① 리더 암으로 시범을 보여 데이터셋 녹화 (카메라 영상 + 관절값 + 행동)</span>
lerobot-record --robot.type=so101_follower --robot.port=/dev/ttyACM0 \\
  --teleop.type=so101_leader --teleop.port=/dev/ttyACM1 \\
  --dataset.repo_id=\${HF_USER}/pick_cube --dataset.num_episodes=50 \\
  --dataset.single_task="Pick the cube and place it in the box"
<span class="cm"># ② 정책 학습 (ACT). --policy.type=diffusion · smolvla 로 바꿀 수 있음</span>
lerobot-train --dataset.repo_id=\${HF_USER}/pick_cube --policy.type=act \\
  --output_dir=outputs/train/act_pick_cube --policy.device=cuda
<span class="cm"># ③ 학습한 정책으로 로봇 실행 · 평가 (명령 이름은 LeRobot 버전에 따라 바뀌니 문서 확인)</span>
lerobot-rollout --policy.path=\${HF_USER}/my_policy --robot.type=so101_follower ...</code></pre>
<table class="tbl cmp">
<tr><th>정책</th><th>한 줄 설명</th><th>특징</th></tr>
<tr><td><b>ACT</b> (Action Chunking with Transformers)</td><td>여러 스텝의 행동을 한 번에(청크) 예측</td><td>데이터 수십 개로도 잘 배움 · 가벼움</td></tr>
<tr><td><b>Diffusion Policy</b></td><td>잡음에서 행동을 점점 다듬어 생성</td><td>여러 가지 풀이가 있는 작업에 강함</td></tr>
<tr><td><b>SmolVLA</b></td><td>작은 VLA(약 4.5억 파라미터)</td><td>“컵을 상자에 넣어” 같은 <b>언어 지시</b>를 받음</td></tr>
</table>
<div class="box trend"><div class="box-t">🚀 최신 동향 — VLA (Vision-Language-Action) 모델</div>
대형 언어 모델처럼 <b>영상 + 문장 → 로봇 행동</b>을 바로 출력하는 모델들이 빠르게 나오고 있습니다. Google DeepMind 의 RT-2, 오픈소스 OpenVLA, Physical Intelligence 의 π0(파이제로), NVIDIA 의 GR00T, Hugging Face 의 SmolVLA 등이 대표적입니다. 이런 모델도 실제 로봇에서는 결국 <b>카메라 토픽을 받고 관절 명령을 내보내는 노드</b>로 들어가므로, 이 강좌에서 배운 토픽 · QoS · TF · ros2_control 지식이 그대로 쓰입니다.</div>
<div class="cards c3">
  <div class="card orange"><div class="ci">🦾</div><b>SO-ARM101 강좌 (LeRobot 실전)</b><p><a href="https://samcho93.github.io/studySOArm101/lessons/ch11.html" target="_blank" rel="noopener">11장 데이터셋 수집</a> · <a href="https://samcho93.github.io/studySOArm101/lessons/ch12.html" target="_blank" rel="noopener">12장 시뮬레이션 데이터(LeIsaac)</a> · <a href="https://samcho93.github.io/studySOArm101/lessons/ch13.html" target="_blank" rel="noopener">13장 정책 학습</a> · <a href="https://samcho93.github.io/studySOArm101/lessons/ch14.html" target="_blank" rel="noopener">14장 추론 · 평가</a> · <a href="https://samcho93.github.io/studySOArm101/lessons/ch20.html" target="_blank" rel="noopener">20장 LeRobot ↔ ROS 2 브릿지</a></p></div>
  <div class="card blue"><div class="ci">🧪</div><b>OpenCV 강좌</b><p>HSV · 모폴로지 · 윤곽선 · 특징점 · 카메라 보정을 더 깊이: <a href="https://samcho93.github.io/studyOpenCV/" target="_blank" rel="noopener">OpenCV 쉽게 배우기</a></p></div>
  <div class="card green"><div class="ci">⚡</div><b>NVIDIA Isaac ROS · Jetson</b><p>GPU 로 가속한 ROS 2 패키지 모음(영상 처리 · 깊이 · 검출 · Visual SLAM). NITROS 로 GPU 메모리를 복사 없이 노드 사이에 넘깁니다. Jetson Orin 같은 로봇용 보드에서 돌립니다. <a href="https://nvidia-isaac-ros.github.io/" target="_blank" rel="noopener">문서</a> — 지원하는 ROS 2 배포판을 먼저 확인하세요.</p></div>
</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — 데이터 수집을 시뮬레이터로 체험</div>
<ol class="steps-list">
<li>아래 SO-ARM101 3D 시뮬레이터를 불러와 관절을 움직여 봅니다.</li>
<li>“같은 작업을 50번 시범 보인다면 무엇이 매번 같아야 할까?”(카메라 위치 · 조명 · 물체 위치 범위)를 생각해 봅니다.</li>
<li>SO-ARM101 강좌 11장에서 실제 <code>lerobot-record</code> 과정을 이어서 따라가 보세요.</li>
</ol></div>
{{widget:embed|url=https://samcho93.github.io/studySOArm101/sim/index.html|h=520|title=SO-ARM101 3D 시뮬레이터|desc=LeRobot 데이터 수집에 쓰는 팔을 브라우저에서 움직여 봅니다}}`
    }
  ],

  videos: [
    { title: 'How to use Cameras in ROS (Sim Camera and Pi Camera)', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=A3nw2M47K50', lang: 'en', min: '25분', desc: '카메라 드라이버 · image_transport · 압축 토픽 · 시뮬레이션 카메라를 실제 로봇으로 보여 줍니다' },
    { title: 'Use a Camera with ROS and OpenCV in Python', channel: 'Aleksandar Haber PhD', url: 'https://www.youtube.com/watch?v=rfwHAYAUm_w', lang: 'en', min: '30분', desc: '카메라 퍼블리셔와 cv_bridge 구독 노드를 파이썬으로 처음부터 작성' },
    { title: 'Object Detection with OpenCV for ROS 2 | Open Class 191', channel: 'The Construct', url: 'https://www.youtube.com/watch?v=pK_SvyOm8pg', lang: 'en', min: '60분', desc: 'OpenCV 기반 물체 검출을 ROS 2 노드로 만드는 라이브 수업' },
    { title: 'Object detection using Yolo3D with ROS2', channel: 'robot mania', url: 'https://www.youtube.com/watch?v=KTCtTLwJXP0', lang: 'en', min: '15분', desc: 'YOLO 검출 결과를 ROS 2 에서 3D 로 확장하는 예제' },
    { title: '100% Pick-and-Place Success with LeRobot + SO-ARM 101', channel: 'Whitney Design Labs', url: 'https://www.youtube.com/watch?v=aGcpayTDnXI', lang: 'en', min: '15분', desc: 'SO-ARM101 로 데이터 수집 → 학습 → 실행까지 모방학습 전 과정' },
    { title: 'ACT vs SmolVLA: Testing on Hugging Face’s LeRobot SO-101', channel: 'Pius Lim', url: 'https://www.youtube.com/watch?v=nWNIsJBwbvU', lang: 'en', min: '10분', desc: 'ACT 정책과 VLA(SmolVLA)를 같은 작업에서 비교' }
  ],

  terms: [
    ['sensor_msgs/Image', '이미지 한 장을 담는 메시지. height · width · encoding · step · data(행을 이어 붙인 바이트 배열)'],
    ['encoding', '픽셀 형식. rgb8 · bgr8(컬러), mono8(흑백), 16UC1(깊이 mm), 32FC1(깊이 m)'],
    ['step', '이미지 한 행이 차지하는 바이트 수. rgb8 이면 width × 3'],
    ['CompressedImage', 'JPEG · PNG 로 압축한 이미지 메시지. format 과 data 만 있음'],
    ['CameraInfo', '카메라 내부 행렬 K, 왜곡 D, 투영 P 등 렌즈 보정값을 담은 메시지'],
    ['image_transport', '같은 영상을 raw · compressed · theora 등 여러 형식으로 발행 · 구독하게 해 주는 플러그인 구조'],
    ['sensor_data QoS', 'BEST_EFFORT · 작은 depth 의 QoS 프로필. 카메라 · LiDAR 처럼 빠르고 잃어도 되는 데이터용'],
    ['cv_bridge', 'ROS Image 메시지와 OpenCV(numpy) 배열을 서로 바꿔 주는 라이브러리 (imgmsg_to_cv2 · cv2_to_imgmsg)'],
    ['HSV', '색상(H) · 채도(S) · 명도(V) 색 공간. 조명 변화에 덜 민감해 색 추적에 씀. OpenCV 는 H 0~179'],
    ['모멘트(moments)', '마스크 픽셀의 합과 가중 합. m10/m00, m01/m00 이 무게중심'],
    ['vision_msgs', 'Detection2D/3D, BoundingBox2D, ObjectHypothesisWithPose 등 검출 결과 표준 메시지 패키지'],
    ['PointCloud2', '3D 점 구름 메시지. fields 로 x · y · z · rgb 배치를 설명하고 data 에 이진으로 담음'],
    ['모방학습', '사람의 시범 데이터(관측 → 행동)를 보고 정책 신경망이 따라 하도록 학습하는 방법. ACT · Diffusion Policy 등'],
    ['VLA', 'Vision-Language-Action 모델. 영상과 문장 지시를 받아 로봇 행동을 직접 출력 (RT-2, OpenVLA, π0, SmolVLA …)'],
    ['Isaac ROS', 'NVIDIA GPU 로 가속한 ROS 2 패키지 모음. NITROS 로 노드 사이 GPU 메모리 복사를 줄임']
  ],

  summary: [
    'Image 메시지는 2차원 픽셀 표를 data 바이트 배열로 펼치고, height · width · encoding · step 으로 다시 읽는 방법을 함께 보냅니다.',
    '카메라 드라이버(v4l2_camera · usb_cam · realsense2_camera)는 Image 와 CameraInfo 를 발행하고, image_transport 가 압축 토픽을 덧붙입니다.',
    '영상은 보통 BEST_EFFORT(sensor_data) QoS 로 오므로 구독도 qos_profile_sensor_data 로 해야 연결됩니다.',
    'cv_bridge 로 받을 때 desired_encoding=\'bgr8\' 을 명시해야 빨강 · 파랑이 뒤바뀌지 않습니다.',
    '감지(색 추적 · YOLO) → /target 또는 Detection2DArray → 판단 · 제어 → cmd_vel 처럼 노드를 나누면 부품 교체가 쉽습니다.',
    '깊이 카메라는 16UC1(mm) 깊이 이미지와 camera_info 로 PointCloud2 를 만들어 3D 인식을 가능하게 합니다.',
    'LeRobot 모방학습 · VLA · Isaac ROS 도 실제 로봇에서는 토픽을 받고 명령을 내는 ROS 2 노드로 동작합니다.'
  ],

  quiz: [
    { q: 'width=640, height=480, encoding=rgb8 인 Image 메시지의 step 과 data 길이로 옳은 것은?', options: ['step 640, data 307,200', 'step 1920, data 921,600', 'step 480, data 921,600', 'step 3, data 640'], answer: 1, explain: 'rgb8 은 픽셀당 3바이트이므로 step = 640 × 3 = 1920 바이트, data 길이 = step × height = 1920 × 480 = 921,600 바이트입니다.' },
    { q: '카메라 드라이버가 BEST_EFFORT 로 /image_raw 를 발행합니다. 내가 만든 노드가 기본 QoS(RELIABLE, depth 10)로 구독하면?', options: ['정상적으로 모두 받는다', '절반만 받는다', 'QoS 가 호환되지 않아 하나도 받지 못한다', '자동으로 압축 토픽으로 바뀐다'], answer: 2, explain: 'RELIABLE 을 요구하는 구독자는 BEST_EFFORT 발행자와 연결되지 않습니다. 영상 구독은 qos_profile_sensor_data 로 하세요.' },
    { q: 'rgb8 로 발행되는 영상을 desired_encoding=\'passthrough\' 로 받아 cv2.COLOR_BGR2HSV 로 변환했습니다. 빨간 공을 찾도록 H 범위를 잡았는데 무엇이 문제일까요?', options: ['OpenCV 는 배열을 BGR 로 읽으므로 빨강과 파랑이 뒤바뀌어 파란 물체를 찾게 된다', '아무 문제 없다', 'HSV 변환이 흑백으로 바뀐다', '이미지가 상하로 뒤집힌다'], answer: 0, explain: 'passthrough 는 rgb8 순서를 그대로 둡니다. OpenCV 는 첫 채널을 B 로 보므로 빨강(R)과 파랑(B)이 바뀝니다. desired_encoding=\'bgr8\' 을 쓰세요.' },
    { q: 'OpenCV 에서 HSV 의 H(색상) 값 범위는?', options: ['0 ~ 360', '0 ~ 255', '0 ~ 179', '0.0 ~ 1.0'], answer: 2, explain: '8비트에 담기 위해 각도(0~359°)를 2로 나눈 0~179 를 씁니다. 그래서 빨강은 0 근처와 179 근처 두 구간을 합쳐야 합니다.' },
    { q: 'YOLO 검출 결과를 다른 팀의 노드와 쉽게 연결하려면 어떤 메시지로 발행하는 것이 좋을까요?', options: ['std_msgs/String 에 JSON 으로', 'vision_msgs/Detection2DArray', 'sensor_msgs/CameraInfo', 'geometry_msgs/Twist'], answer: 1, explain: 'vision_msgs 는 검출 결과(종류 · 확신도 · 상자)를 위한 표준 메시지라 RViz 플러그인, 추적기 등과 바로 호환됩니다.' },
    { q: '깊이 이미지의 encoding 이 16UC1 일 때 픽셀 값 1250 의 뜻은?', options: ['1250 미터', '1.25 미터 (밀리미터 단위)', '밝기 1250', '12.5 센티미터'], answer: 1, explain: '16UC1 깊이 이미지는 밀리미터 단위 정수를 씁니다(REP 118). 32FC1 이면 미터 단위 실수입니다.' },
    { q: 'LeRobot 모방학습의 순서로 옳은 것은?', options: ['학습 → 녹화 → 시범 → 실행', '시범(텔레옵)으로 데이터셋 녹화 → 정책 학습(ACT 등) → 로봇에서 정책 실행', 'YOLO 학습 → HSV 설정 → 실행', 'URDF 작성 → MoveIt 계획 → 녹화'], answer: 1, explain: '리더 암으로 시범을 보이며 관측과 행동을 녹화(lerobot-record)하고, 정책을 학습(lerobot-train)한 뒤 로봇에서 실행 · 평가합니다.' }
  ],

  slides: [
    { title: '로봇은 무엇으로 “볼까”?', layout: 'center', html: `<div class="s-big">📷 → 🔢 → 🤖<br>카메라가 준 <b>숫자 표</b>를<br>로봇의 <b>행동</b>으로 바꾸기</div>`, notes: '“사람은 공을 보면 손을 뻗습니다. 로봇은?” 하고 묻고 학생들의 답을 받습니다. 오늘은 숫자 표(Image) → 해석(OpenCV · YOLO) → 행동(cmd_vel)까지 한 줄로 잇는다고 안내합니다. (2분)' },
    { title: 'Image 메시지 해부', html: `{{fig:imageMsg|nocap}}`, notes: '4×3 픽셀 예로 step = width × 3, data 길이 = step × height 를 계산해 봅니다. 640×480 이면 약 0.9 MB, 30 fps 면 초당 27 MB 라는 점에서 압축과 QoS 의 필요성을 끌어냅니다. (5분)' },
    { title: 'encoding 네 가지', html: `<div class="s-cols c3"><div><b>rgb8 / bgr8</b><br>컬러 · 순서만 다름</div><div><b>mono8</b><br>흑백 · 마스크</div><div><b>16UC1 / 32FC1</b><br>깊이 mm / m</div></div>`, notes: 'OpenCV 는 bgr8 순서를 쓴다는 점을 강조합니다. 깊이 이미지 단위(mm vs m)를 틀리면 로봇이 1000배 먼 곳을 본다는 농담으로 기억시킵니다. (3분)' },
    { title: '카메라 파이프라인', html: `{{fig:camPipe|nocap}}`, notes: '드라이버는 영상을 해석하지 않고 발행만 한다는 역할 분리를 설명합니다. image_transport 가 compressed 하위 토픽을 자동으로 만든다는 점, camera_info 가 보정값을 담는다는 점을 짚습니다. (4분)' },
    { title: 'RELIABLE vs BEST_EFFORT', html: `<div class="vs"><div class="vs-a blue"><b>RELIABLE</b><ul><li>명령 · 상태</li><li>빠지면 재전송</li></ul></div><div class="vs-mid">VS</div><div class="vs-b orange"><b>BEST_EFFORT</b><ul><li>카메라 · LiDAR</li><li>빠지면 버림</li></ul></div></div>`, notes: '“영상이 안 와요” 질문의 1순위 원인이 QoS 불일치라는 점을 강조합니다. ros2 topic info -v 로 확인하는 방법을 예고합니다. (3분)' },
    { title: 'cv_bridge', html: `{{fig:cvBridge|nocap}}`, notes: 'imgmsg_to_cv2 에 desired_encoding 을 꼭 쓰라고 강조합니다. passthrough 로 rgb8 을 받으면 빨간 공이 파랗게 보이는 함정을 그림으로 보여 줍니다. (4분)' },
    { title: '색 추적 노드의 6단계', html: `{{fig:hsvFlow}}`, notes: 'BGR → HSV → inRange → 열기 → moments → Point 발행. HSV 를 쓰는 이유(조명 변화에 H 가 안정적)와 OpenCV 의 H 0~179 를 설명합니다. (4분)' },
    { title: '실습: 빨간 공을 쫓는 거북이', html: `{{widget:vision|follow=turtle|color=red}}`, notes: '공을 끌어 옮기며 /target 의 x 값과 거북이 회전 방향을 연결해 봅니다. 초록 프리셋으로 바꿔 마스크 변화를 보여 주고, 원하면 웹캠 모드도 시연합니다. (8분)' },
    { title: 'rqt_graph 로 본 파이프라인', html: `{{fig:trackGraph|nocap}}`, notes: '감지 → 판단 → 행동이 노드로 나뉘어 있다는 점을 강조합니다. 카메라를 실제 웹캠으로, 거북이를 실제 로봇으로 바꿔도 가운데 노드는 그대로라는 점을 묻고 답합니다. (3분)' },
    { title: 'YOLO 와 vision_msgs', html: `{{fig:yoloGraph|nocap}}`, notes: '색이 아니라 “종류”를 찾는 검출기. 결과를 표준 메시지(Detection2DArray)로 발행해야 다른 노드와 연결된다는 점을 강조합니다. class_id · score · bbox 필드를 읽어 봅니다. (4분)' },
    { title: '깊이 카메라 → 포인트 클라우드', html: `{{fig:depthFig|nocap}}`, notes: '16UC1 은 mm, 32FC1 은 m. camera_info 의 fx, fy, cx, cy 로 픽셀과 깊이를 3D 점으로 바꾸는 식을 보여 줍니다. 검출 + 깊이 + TF + MoveIt 으로 이어지는 큰 그림을 제시합니다. (4분)' },
    { title: '모방학습 한 바퀴', html: `{{fig:lerobotFlow|nocap}}`, notes: '시범 → 데이터셋 → 학습 → 실행. ACT · Diffusion · SmolVLA 를 한 줄씩 소개하고, 결국 ROS 2 토픽으로 카메라를 받고 관절 명령을 내는 노드가 된다는 점을 강조합니다. SO-ARM101 강좌 11~14장, 20장을 안내합니다. (5분)' },
    { title: '오늘의 핵심', layout: 'center', html: `<div class="s-big">encoding 은 <b>bgr8</b>,<br>영상 QoS 는 <b>sensor_data</b>,<br>노드는 <b>감지 → 판단 → 행동</b></div>`, notes: '세 가지 문장으로 정리하고 퀴즈로 넘어갑니다. (2분)' }
  ]
});
