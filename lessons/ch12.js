/* 12장 — TF2: 좌표계 변환 */
(function () {
  const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  Course.lesson({
    id: 'ch12', no: '12',
    icon: '🧭',
    title: 'TF2 — 좌표계 변환',
    subtitle: '라이다가 본 장애물은 지도에서 어디에 있을까?',
    level: '중급', time: '150분',
    goals: [
      '로봇에 좌표계(프레임)가 여러 개 필요한 이유와 REP 103 규칙(x 앞 · y 왼쪽 · z 위, m · rad)을 설명할 수 있다',
      'REP 105 의 map → odom → base_link 구조와 각 변환을 누가 발행하는지 그림으로 그릴 수 있다',
      '정적 변환(/tf_static)과 동적 변환(/tf)을 구분하고 static_transform_publisher · tf2_echo · view_frames 를 쓸 수 있다',
      'rclpy 로 TF 브로드캐스터와 리스너를 만들어 거북이가 거북이를 따라가게 할 수 있다',
      '"frame does not exist" · extrapolation · 두 개의 트리 같은 TF 오류의 원인을 찾을 수 있다'
    ],
    teacher: {
      intro: '“라이다가 ‘앞 1.5 m 에 벽이 있다’고 말했습니다. 그 벽은 지도에서 어디일까요?” 하고 묻습니다. 로봇이 어디를 보고 서 있는지, 라이다가 로봇 어디에 붙어 있는지 모르면 답할 수 없다는 것을 끌어내며 시작합니다. (3분)',
      flow: '① 도입 · 여러 센서와 좌표계 10분 → ② REP 103 축 · 단위 · 쿼터니언 20분 → ③ REP 105 map · odom · base_link + TF 놀이터 20분 → ④ 정적/동적 변환 · tf2_echo 실습 20분 → ⑤ view_frames · TF 트리 10분 → ⑥ turtle_tf2 데모 20분 → ⑦ 파이썬 브로드캐스터 · 리스너 25분 → ⑧ 점 변환 계산 · RViz · 오류 사례 15분 → ⑨ 퀴즈 10분'
    },

    figs: {
      /* ---------------------------------------------------------------- 센서마다 좌표계 */
      frames: {
        caption: '한 로봇 안의 여러 좌표계 — 같은 장애물도 센서마다 다른 숫자로 보입니다 (옆에서 본 그림, y 축은 화면 밖을 향함)',
        svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="로봇 몸체, 라이다, 카메라, IMU 가 각자 좌표계를 가지고 같은 장애물을 다르게 봄">
  <rect x="20" y="16" width="520" height="328" rx="16" class="box"/>
  <text x="280" y="40" class="t-b t-c">모바일 로봇 (옆모습)</text>
  <rect x="110" y="190" width="320" height="80" rx="14" class="blue"/>
  <text x="200" y="232" class="t-sm t-c t-blue t-b">몸체</text>
  <circle cx="165" cy="285" r="28" class="gray"/><circle cx="375" cy="285" r="28" class="gray"/>
  <rect x="280" y="150" width="60" height="40" rx="8" class="teal"/>
  <text x="310" y="136" class="t-xs t-c t-teal t-b">laser</text>
  <rect x="430" y="208" width="40" height="34" rx="6" class="orange"/>
  <text x="450" y="196" class="t-xs t-c t-orange t-b">camera_link</text>
  <rect x="230" y="222" width="40" height="30" rx="6" class="purple"/>
  <text x="250" y="268" class="t-xs t-c t-purple t-b">imu_link</text>
  <line x1="270" y1="313" x2="330" y2="313" class="ln-red thick ar-red"/>
  <line x1="270" y1="313" x2="270" y2="263" class="ln-blue thick ar-blue"/>
  <circle cx="270" cy="313" r="5" class="green"/>
  <text x="240" y="332" class="t-xs t-mono">base_link</text>
  <line x1="310" y1="170" x2="350" y2="170" class="ln-red ar-red"/>
  <line x1="310" y1="170" x2="310" y2="145" class="ln-blue ar-blue"/>
  <line x1="450" y1="225" x2="490" y2="225" class="ln-red ar-red"/>
  <line x1="450" y1="225" x2="450" y2="200" class="ln-blue ar-blue"/>
  <line x1="340" y1="170" x2="600" y2="170" class="ln-teal dash moving"/>
  <line x1="470" y1="225" x2="600" y2="185" class="ln-orange dash moving"/>
  <rect x="600" y="120" width="60" height="150" rx="6" class="red"/>
  <text x="630" y="290" class="t-sm t-c t-red t-b">장애물</text>
  <rect x="690" y="40" width="170" height="270" rx="12" class="box"/>
  <text x="775" y="64" class="t-sm t-c t-b">같은 장애물, 다른 숫자</text>
  <text x="775" y="100" class="t-xs t-c t-teal t-b">laser 기준</text>
  <text x="775" y="120" class="t-xs t-c t-mono">x=1.50 z=0.00</text>
  <text x="775" y="156" class="t-xs t-c t-orange t-b">camera_link 기준</text>
  <text x="775" y="176" class="t-xs t-c t-mono">x=1.30 z=-0.05</text>
  <text x="775" y="212" class="t-xs t-c t-blue t-b">base_link 기준</text>
  <text x="775" y="232" class="t-xs t-c t-mono">x=1.60 z=0.20</text>
  <text x="775" y="270" class="t-xs t-c t-mu">→ TF 가 자동으로</text>
  <text x="775" y="290" class="t-xs t-c t-mu">서로 바꿔 줍니다</text>
</svg>`
      },

      /* ---------------------------------------------------------------- REP 103 */
      rep103: {
        caption: 'REP 103 — 오른손 좌표계: x 앞(빨강) · y 왼쪽(초록) · z 위(파랑). 엄지를 축 방향으로 두고 감싸 쥐는 방향이 + 회전',
        svg: `<svg class="dg" viewBox="0 0 880 340" role="img" aria-label="REP 103 좌표축과 roll pitch yaw, 쿼터니언 예">
  <rect x="20" y="16" width="300" height="308" rx="16" class="box"/>
  <text x="170" y="42" class="t-b t-c">base_link 의 축</text>
  <line x1="170" y1="220" x2="265" y2="160" class="ln-red thick ar-red"/>
  <line x1="170" y1="220" x2="60" y2="220" class="ln-green thick ar-green"/>
  <line x1="170" y1="220" x2="170" y2="90" class="ln-blue thick ar-blue"/>
  <circle cx="170" cy="220" r="6" class="gray"/>
  <text x="282" y="152" class="t-sm t-red t-b">x 앞</text>
  <text x="52" y="244" class="t-sm t-green t-b">y 왼쪽</text>
  <text x="182" y="92" class="t-sm t-blue t-b">z 위</text>
  <text x="170" y="282" class="t-xs t-c t-mu">단위: 길이 m · 각도 rad · 시간 s</text>
  <text x="170" y="302" class="t-xs t-c t-mu">속도 m/s · 각속도 rad/s</text>

  <rect x="340" y="16" width="250" height="308" rx="16" class="box"/>
  <text x="465" y="42" class="t-b t-c">회전 이름 (RPY)</text>
  <rect x="360" y="62" width="210" height="72" rx="10" class="red"/>
  <text x="465" y="88" class="t-sm t-c t-red t-b">roll — x 축 회전</text>
  <text x="465" y="112" class="t-xs t-c">비행기 날개 기울기</text>
  <rect x="360" y="146" width="210" height="72" rx="10" class="green"/>
  <text x="465" y="172" class="t-sm t-c t-green t-b">pitch — y 축 회전</text>
  <text x="465" y="196" class="t-xs t-c">고개 끄덕이기</text>
  <rect x="360" y="230" width="210" height="72" rx="10" class="blue"/>
  <text x="465" y="256" class="t-sm t-c t-blue t-b">yaw — z 축 회전</text>
  <text x="465" y="280" class="t-xs t-c">고개 좌우로 돌리기 (+ = 왼쪽)</text>

  <rect x="610" y="16" width="250" height="308" rx="16" class="purple"/>
  <text x="735" y="42" class="t-b t-c t-purple">쿼터니언 (x, y, z, w)</text>
  <text x="735" y="76" class="t-xs t-c">회전축 × sin(θ/2) , cos(θ/2)</text>
  <text x="735" y="112" class="t-xs t-c t-b">회전 없음</text>
  <text x="735" y="132" class="t-sm t-c t-mono">(0, 0, 0, 1)</text>
  <text x="735" y="166" class="t-xs t-c t-b">yaw 90° (왼쪽으로 돌기)</text>
  <text x="735" y="186" class="t-sm t-c t-mono">(0, 0, 0.707, 0.707)</text>
  <text x="735" y="220" class="t-xs t-c t-b">yaw 180°</text>
  <text x="735" y="240" class="t-sm t-c t-mono">(0, 0, 1, 0)</text>
  <text x="735" y="280" class="t-xs t-c t-mu">항상 길이 1 (정규화)</text>
  <text x="735" y="300" class="t-xs t-c t-mu">짐벌 락 없음 · 보간이 매끄러움</text>
</svg>`
      },

      /* ---------------------------------------------------------------- REP 105 */
      rep105: {
        caption: 'REP 105 — 모바일 로봇의 표준 TF 트리. 한 프레임의 부모는 하나뿐이고, 각 변환은 서로 다른 노드가 책임집니다',
        svg: `<svg class="dg" viewBox="0 0 880 420" role="img" aria-label="map, odom, base_footprint, base_link, 센서 프레임으로 이어지는 TF 트리와 발행 노드">
  <rect x="80" y="20" width="160" height="46" rx="23" class="s-purple"/>
  <text x="160" y="43" class="t-b t-c tw">map</text>
  <rect x="80" y="112" width="160" height="46" rx="23" class="s-purple"/>
  <text x="160" y="135" class="t-b t-c tw">odom</text>
  <rect x="80" y="204" width="160" height="46" rx="23" class="purple"/>
  <text x="160" y="227" class="t-b t-c t-purple">base_footprint</text>
  <rect x="80" y="286" width="160" height="46" rx="23" class="purple"/>
  <text x="160" y="309" class="t-b t-c t-purple">base_link</text>
  <rect x="20" y="364" width="110" height="40" rx="20" class="teal"/><text x="75" y="384" class="t-sm t-c t-teal t-b">laser</text>
  <rect x="140" y="364" width="130" height="40" rx="20" class="orange"/><text x="205" y="384" class="t-sm t-c t-orange t-b">camera_link</text>
  <rect x="280" y="364" width="110" height="40" rx="20" class="gray"/><text x="335" y="384" class="t-sm t-c t-b">imu_link</text>

  <line x1="160" y1="66" x2="160" y2="108" class="ln-red thick ar-red"/>
  <line x1="160" y1="158" x2="160" y2="200" class="ln-blue thick ar-blue"/>
  <line x1="160" y1="250" x2="160" y2="282" class="ln dash ar"/>
  <line x1="130" y1="332" x2="80" y2="362" class="ln dash ar"/>
  <line x1="165" y1="332" x2="200" y2="362" class="ln dash ar"/>
  <line x1="220" y1="326" x2="320" y2="362" class="ln dash ar"/>

  <rect x="300" y="60" width="560" height="56" rx="10" class="red"/>
  <text x="315" y="82" class="t-sm t-red t-b">map → odom : 위치 추정 (AMCL · slam_toolbox)</text>
  <text x="315" y="104" class="t-xs">오도메트리가 쌓은 오차를 고쳐 줌 · 가끔 ‘뚝’ 점프할 수 있음 · 장기적으로 정확</text>
  <rect x="300" y="150" width="560" height="56" rx="10" class="blue"/>
  <text x="315" y="172" class="t-sm t-blue t-b">odom → base_footprint : 오도메트리 (diff_drive_controller · EKF)</text>
  <text x="315" y="194" class="t-xs">바퀴 · IMU 로 계산 · 부드럽고 연속적 · 시간이 갈수록 조금씩 틀어짐(드리프트)</text>
  <rect x="420" y="240" width="440" height="72" rx="10" class="gray"/>
  <text x="435" y="262" class="t-sm t-b">base_footprint → base_link → 센서 : robot_state_publisher</text>
  <text x="435" y="284" class="t-xs">URDF 의 고정 조인트 → /tf_static (점선)</text>
  <text x="435" y="302" class="t-xs t-mu">base_footprint = base_link 를 바닥에 내려 찍은 점 (z = 0)</text>
  <text x="620" y="360" class="t-xs t-c t-mu">── /tf (동적, 계속 발행)     ┄┄ /tf_static (정적, 한 번)</text>
</svg>`
      },

      /* ---------------------------------------------------------------- /tf vs /tf_static */
      staticDyn: {
        caption: '두 개의 TF 토픽 — 움직이는 변환은 /tf 로 계속, 고정된 변환은 /tf_static 으로 한 번(transient_local 로 늦게 온 구독자에게도 전달)',
        svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="브로드캐스터 노드들이 /tf 와 /tf_static 토픽에 발행하고 리스너가 구독">
  <ellipse cx="140" cy="60" rx="120" ry="30" class="blue"/><text x="140" y="60" class="t-sm t-c t-b t-blue">static_transform_publisher</text>
  <ellipse cx="140" cy="140" rx="120" ry="30" class="blue"/><text x="140" y="140" class="t-sm t-c t-b t-blue">robot_state_publisher</text>
  <ellipse cx="140" cy="220" rx="120" ry="30" class="blue"/><text x="140" y="220" class="t-sm t-c t-b t-blue">diff_drive_controller</text>
  <rect x="350" y="62" width="170" height="56" rx="6" class="green"/>
  <text x="435" y="84" class="t-b t-c t-green">/tf_static</text>
  <text x="435" y="104" class="t-xs t-c">transient_local · 한 번</text>
  <rect x="350" y="176" width="170" height="56" rx="6" class="green"/>
  <text x="435" y="198" class="t-b t-c t-green">/tf</text>
  <text x="435" y="218" class="t-xs t-c">volatile · 10~100 Hz</text>
  <line x1="260" y1="66" x2="346" y2="84" class="ln ar"/>
  <line x1="258" y1="132" x2="346" y2="100" class="ln ar"/>
  <line x1="258" y1="150" x2="346" y2="190" class="ln ar"/>
  <line x1="260" y1="218" x2="346" y2="206" class="ln ar moving"/>
  <text x="300" y="165" class="t-xs t-c t-mu">고정 조인트</text>
  <text x="300" y="250" class="t-xs t-c t-mu">바퀴 오도메트리</text>
  <ellipse cx="740" cy="90" rx="110" ry="30" class="blue"/><text x="740" y="90" class="t-sm t-c t-b t-blue">rviz2</text>
  <ellipse cx="740" cy="200" rx="110" ry="30" class="blue"/><text x="740" y="200" class="t-sm t-c t-b t-blue">nav2 (TF 리스너)</text>
  <line x1="522" y1="90" x2="626" y2="90" class="ln ar"/>
  <line x1="522" y1="200" x2="626" y2="200" class="ln ar moving"/>
  <line x1="522" y1="104" x2="628" y2="186" class="ln ar"/>
  <line x1="522" y1="190" x2="628" y2="104" class="ln ar"/>
  <text x="740" y="264" class="t-xs t-c t-mu">리스너는 둘 다 구독해서 Buffer 에 모아 둡니다</text>
</svg>`
      },

      /* ---------------------------------------------------------------- turtle_tf2 그래프 */
      turtleTf: {
        caption: 'turtle_tf2_demo 의 노드 그래프 — 거북이 위치(pose)를 TF 로 바꾸고, 리스너가 turtle2 기준 turtle1 의 위치를 물어 속도를 계산합니다',
        svg: `<svg class="dg" viewBox="0 0 880 320" role="img" aria-label="turtle_tf2 데모: sim, broadcaster1, broadcaster2, listener 와 토픽">
  <ellipse cx="100" cy="160" rx="80" ry="32" class="blue"/><text x="100" y="160" class="t-b t-c t-blue">/sim</text>
  <rect x="220" y="60" width="150" height="40" rx="6" class="green"/><text x="295" y="80" class="t-sm t-c t-green t-b">/turtle1/pose</text>
  <rect x="220" y="220" width="150" height="40" rx="6" class="green"/><text x="295" y="240" class="t-sm t-c t-green t-b">/turtle2/pose</text>
  <ellipse cx="490" cy="80" rx="95" ry="30" class="blue"/><text x="490" y="80" class="t-sm t-c t-b t-blue">/broadcaster1</text>
  <ellipse cx="490" cy="240" rx="95" ry="30" class="blue"/><text x="490" y="240" class="t-sm t-c t-b t-blue">/broadcaster2</text>
  <rect x="610" y="140" width="80" height="40" rx="6" class="green"/><text x="650" y="160" class="t-b t-c t-green">/tf</text>
  <ellipse cx="790" cy="160" rx="75" ry="30" class="blue"/><text x="790" y="160" class="t-sm t-c t-b t-blue">/listener</text>
  <rect x="560" y="276" width="170" height="36" rx="6" class="green"/><text x="645" y="294" class="t-sm t-c t-green t-b">/turtle2/cmd_vel</text>
  <line x1="160" y1="140" x2="216" y2="86" class="ln ar"/>
  <line x1="160" y1="180" x2="216" y2="234" class="ln ar"/>
  <line x1="372" y1="80" x2="392" y2="80" class="ln ar"/>
  <line x1="372" y1="240" x2="392" y2="240" class="ln ar"/>
  <line x1="570" y1="96" x2="612" y2="140" class="ln ar moving"/>
  <line x1="570" y1="224" x2="612" y2="180" class="ln ar moving"/>
  <line x1="692" y1="160" x2="712" y2="160" class="ln ar"/>
  <line x1="780" y1="190" x2="732" y2="282" class="ln ar"/>
  <path d="M560,294 C300,300 140,260 100,194" class="ln ar"/>
  <text x="790" y="110" class="t-xs t-c t-mu">lookup_transform(</text>
  <text x="790" y="126" class="t-xs t-c t-mu">'turtle2', 'turtle1')</text>
</svg>`
      },

      /* ---------------------------------------------------------------- 점 변환 */
      pointXf: {
        caption: '점 변환 예 — 라이다가 본 (1.5, 0) 은 base_link 에서 (1.6, 0), 지도(map)에서는 (2.0, 2.6) 입니다 (위에서 본 그림, 1칸 = 0.5 m)',
        svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="라이다 좌표의 점을 base_link, map 좌표로 바꾸는 계산">
  <rect x="20" y="16" width="440" height="328" rx="14" class="box"/>
  <line x1="60" y1="310" x2="440" y2="310" class="ln thin"/>
  <line x1="60" y1="310" x2="60" y2="30" class="ln thin"/>
  <line x1="60" y1="310" x2="140" y2="310" class="ln-red thick ar-red"/>
  <line x1="60" y1="310" x2="60" y2="230" class="ln-green thick ar-green"/>
  <text x="70" y="330" class="t-xs t-mono">map (0,0)</text>
  <rect x="236" y="226" width="48" height="60" rx="8" class="blue"/>
  <line x1="260" y1="256" x2="260" y2="186" class="ln-red thick ar-red"/>
  <line x1="260" y1="256" x2="190" y2="256" class="ln-green thick ar-green"/>
  <text x="300" y="262" class="t-xs t-mono t-blue">base_link</text>
  <text x="300" y="280" class="t-xs t-mono t-mu">(2.0, 1.0) yaw 90°</text>
  <circle cx="260" cy="236" r="5" class="teal"/>
  <text x="300" y="232" class="t-xs t-mono t-teal">laser (+0.1 앞)</text>
  <line x1="260" y1="236" x2="260" y2="86" class="ln-teal dash moving"/>
  <circle cx="260" cy="80" r="10" class="red"/>
  <text x="280" y="70" class="t-sm t-red t-b">장애물</text>
  <text x="280" y="92" class="t-xs t-mono">laser: (1.5, 0)</text>
  <rect x="480" y="16" width="380" height="328" rx="14" class="box"/>
  <text x="670" y="42" class="t-b t-c">tf2 가 대신 해 주는 계산</text>
  <text x="500" y="80" class="t-sm t-teal t-b">① laser 좌표</text>
  <text x="520" y="102" class="t-sm t-mono">p = (1.5, 0.0)</text>
  <text x="500" y="140" class="t-sm t-blue t-b">② base_link ← laser (고정)</text>
  <text x="520" y="162" class="t-sm t-mono">+ (0.1, 0) → (1.6, 0.0)</text>
  <text x="500" y="200" class="t-sm t-purple t-b">③ map ← base_link (움직임)</text>
  <text x="520" y="222" class="t-sm t-mono">90° 회전 → (0.0, 1.6)</text>
  <text x="520" y="244" class="t-sm t-mono">+ (2.0, 1.0) → (2.0, 2.6)</text>
  <text x="670" y="290" class="t-xs t-c t-mu">p_map = T(map←base) · T(base←laser) · p_laser</text>
  <text x="670" y="312" class="t-xs t-c t-mu">코드에서는 tf_buffer.transform(p, 'map') 한 줄</text>
</svg>`
      },

      tfFlow: `<div class="flow"><div class="fb blue"><span class="fi">📡</span><b>브로드캐스터</b>변환을 /tf · /tf_static 에 발행</div><div class="fb green"><span class="fi">🧺</span><b>Buffer</b>최근 10초 변환을 시간과 함께 저장</div><div class="fb purple"><span class="fi">🔎</span><b>리스너</b>lookup_transform(target, source)</div><div class="fb orange"><span class="fi">🧮</span><b>결과</b>여러 단계를 곱해 한 번에</div></div>`
    },

    sections: [
      /* ============================================================ 1 */
      {
        title: '왜 좌표계가 여러 개 필요할까?',
        html: `<p>로봇에는 센서가 여러 개 달려 있습니다. 라이다는 지붕 위에, 카메라는 앞쪽에, IMU 는 몸통 안에 있습니다. 각 센서는 <b>자기 자신을 원점으로</b> 측정합니다. 라이다가 “앞 1.5 m 에 벽”이라고 말하면, 그 ‘앞’은 라이다의 앞입니다.</p>
<p>그런데 로봇이 실제로 알고 싶은 것은 “벽이 <b>로봇 몸체</b>에서 얼마나 떨어져 있나”, “벽이 <b>지도</b>의 어디에 있나”입니다. 이렇게 한 좌표계의 값을 다른 좌표계의 값으로 바꾸는 것을 <b>좌표 변환(transform)</b>이라 하고, ROS 2 에서 이 일을 맡는 라이브러리가 <b>TF2</b>(Transform library 2)입니다.</p>
{{fig:frames}}
<div class="box analogy"><div class="box-t">🍳 비유 — “내 왼쪽” 과 “네 왼쪽”</div>마주 보고 앉은 친구에게 “왼쪽 컵 좀 줘” 라고 하면 헷갈립니다. 누구의 왼쪽인지(기준 좌표계)를 말해야 합니다. ROS 의 모든 위치 메시지에 <code>header.frame_id</code> 가 붙어 있는 이유도 같습니다. “이 숫자는 <b>laser</b> 기준입니다” 라고 꼬리표를 다는 것이죠.</div>
<p>TF2 는 로봇의 모든 좌표계(<b>프레임, frame</b>)를 <b>나무(트리)</b>로 연결해 두고, 아무 두 프레임 사이의 변환을 <b>시간과 함께</b> 계산해 줍니다. 각 노드는 자기가 아는 변환 하나만 알려 주면 되고, 필요한 노드는 “A 기준으로 B 는 어디?” 라고 묻기만 하면 됩니다.</p>
{{fig:tfFlow}}
<div class="cards c3">
<div class="card blue"><div class="ci">🧭</div><b>프레임(frame)</b><p>원점 + x · y · z 축 한 벌. 이름으로 부릅니다: <code>map</code>, <code>base_link</code>, <code>laser</code> …</p></div>
<div class="card green"><div class="ci">↔️</div><b>변환(transform)</b><p>부모 프레임에서 본 자식 프레임의 위치(translation)와 자세(rotation)</p></div>
<div class="card purple"><div class="ci">🌳</div><b>TF 트리</b><p>모든 프레임이 부모-자식으로 이어진 나무. 부모는 하나뿐입니다.</p></div>
</div>`
      },

      /* ============================================================ 2 */
      {
        title: 'REP 103 — 축 방향 · 단위 · 회전 표현',
        html: `<p>로봇마다 “앞이 x 냐 y 냐” 가 다르면 코드를 나눠 쓸 수 없습니다. 그래서 ROS 커뮤니티는 <b>REP 103</b>(ROS Enhancement Proposal — 표준 단위와 좌표 규약)에 약속을 정해 두었습니다.</p>
{{fig:rep103}}
<table class="tbl">
<tr><th>약속</th><th>내용</th><th>기억법</th></tr>
<tr><td>오른손 좌표계</td><td><b>x 앞 · y 왼쪽 · z 위</b> (몸체 기준)</td><td>오른손 엄지 x, 검지 y, 중지 z</td></tr>
<tr><td>회전 방향</td><td>축을 엄지 방향에 두고 네 손가락을 감싸 쥐는 방향이 +</td><td>yaw + = 위에서 봤을 때 반시계(왼쪽으로 돎)</td></tr>
<tr><td>단위</td><td>길이 m · 각도 rad · 시간 s · 질량 kg</td><td>90° = π/2 ≈ 1.5708 rad</td></tr>
<tr><td>카메라 광학 프레임</td><td><code>*_optical</code> 접미사: z 앞 · x 오른쪽 · y 아래</td><td>영상 처리(OpenCV) 규약을 따름</td></tr>
<tr><td>지도(ENU)</td><td>x 동쪽 · y 북쪽 · z 위</td><td>East-North-Up</td></tr>
</table>
<h4>쿼터니언 — 왜 roll · pitch · yaw 로 저장하지 않을까?</h4>
<p>사람에게는 roll · pitch · yaw(오일러 각)가 편합니다. 하지만 TF 메시지(<code>geometry_msgs/msg/Transform</code>)는 회전을 <b>쿼터니언(quaternion)</b> <code>(x, y, z, w)</code> 네 숫자로 저장합니다.</p>
<div class="vs"><div class="vs-a orange"><b>오일러 각 (RPY)</b><ul><li>세 숫자라 읽기 쉬움</li><li>회전 <b>순서</b>에 따라 결과가 달라짐</li><li>pitch ±90° 에서 두 축이 겹쳐 자유도를 잃음(<b>짐벌 락</b>)</li><li>180° ↔ −180° 경계에서 값이 튐</li></ul></div><div class="vs-mid">VS</div><div class="vs-b purple"><b>쿼터니언</b><ul><li>“회전축 한 개 + 그 축으로 얼마나 돌았나”</li><li>(x,y,z) = 축 × sin(θ/2), w = cos(θ/2)</li><li>짐벌 락 없음, 두 자세 사이 보간이 매끄러움</li><li>길이가 항상 1 이어야 함 (회전 없음 = (0,0,0,1))</li></ul></div></div>
<div class="box tip"><div class="box-t">💡 팁 — 쿼터니언은 직접 외우지 마세요</div>평면 로봇이면 yaw 만 쓰므로 <code>z = sin(yaw/2)</code>, <code>w = cos(yaw/2)</code> 만 기억하면 충분합니다. 나머지는 <code>tf_transformations.quaternion_from_euler(roll, pitch, yaw)</code> 나 명령줄의 <code>--roll --pitch --yaw</code> 옵션이 계산해 줍니다. <code>w</code> 를 0 으로 둔 “모두 0” 쿼터니언은 잘못된 값이라 경고가 납니다.</div>
<p>터미널에서 직접 확인해 볼까요? <code>--yaw 1.5708</code>(90°) 로 정적 변환을 발행하면 쿼터니언이 <code>(0, 0, 0.707, 0.707)</code> 로 계산되어 나옵니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run tf2_ros static_transform_publisher --x 1 --y 2 --yaw 1.5708 --frame-id world --child-frame-id robot &amp;
ros2 run tf2_ros tf2_echo world robot</code></pre>
<pre class="code out" data-lang="출력"><code>At time 0.0
- Translation: [1.000, 2.000, 0.000]
- Rotation: in Quaternion [0.000, 0.000, 0.707, 0.707]
- Rotation: in RPY (radian) [0.000, 0.000, 1.571]
- Rotation: in RPY (degree) [0.000, 0.000, 90.000]</code></pre>
{{widget:term|chips=ros2 run tf2_ros static_transform_publisher --x 1 --y 2 --yaw 1.5708 --frame-id world --child-frame-id robot &;ros2 run tf2_ros tf2_echo world robot;ros2 topic echo /tf_static --once}}`
      },

      /* ============================================================ 3 */
      {
        title: 'REP 105 — map · odom · base_link',
        html: `<p>모바일 로봇의 프레임 이름과 연결 방법은 <b>REP 105</b> 가 정합니다. Nav2 · slam_toolbox · robot_localization 같은 패키지가 모두 이 이름을 기대하므로, 우리 로봇도 이 규칙을 따르면 바로 연결됩니다.</p>
{{fig:rep105}}
<table class="tbl">
<tr><th>프레임</th><th>뜻</th><th>특징</th></tr>
<tr><td><code>map</code></td><td>지도에 고정된 세계 좌표</td><td>장기적으로 정확. 위치 추정이 고쳐 주면 로봇 위치가 <b>불연속으로 점프</b>할 수 있음</td></tr>
<tr><td><code>odom</code></td><td>출발점 기준 오도메트리 좌표</td><td>항상 <b>연속적이고 부드러움</b>(제어에 좋음). 대신 시간이 지나면 조금씩 틀어짐(드리프트)</td></tr>
<tr><td><code>base_footprint</code></td><td>로봇 중심을 바닥에 내려 찍은 점</td><td>z = 0 인 2D 평면용 (선택 사항)</td></tr>
<tr><td><code>base_link</code></td><td>로봇 몸체에 붙은 좌표</td><td>보통 두 바퀴 축 가운데. 센서 프레임들의 부모</td></tr>
<tr><td><code>laser</code>, <code>camera_link</code>, <code>imu_link</code></td><td>센서 장착 위치</td><td>URDF 의 고정 조인트 → <code>/tf_static</code></td></tr>
</table>
<div class="box note"><div class="box-t">📝 왜 map → base_link 를 바로 잇지 않을까?</div>한 프레임의 부모는 <b>하나</b>여야 합니다. base_link 의 부모를 odom 으로 두면 오도메트리 노드는 “odom → base_link” 만, 위치 추정 노드는 “map → odom”(오차 보정량)만 발행하면 됩니다. 두 노드가 서로 싸우지 않고, 제어기는 부드러운 odom 좌표를, 경로 계획은 정확한 map 좌표를 골라 쓸 수 있습니다.</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — TF 놀이터 (모바일 로봇)</div><ol class="steps-list">
<li><b>▶ 움직이기</b> 를 눌러 로봇이 돌아다니게 하고, <code>odom → base_link</code> 화살표(굵은 선)가 변하는 것을 봅니다.</li>
<li><b>변환 조절</b> 탭에서 <code>map → odom</code> 의 x 를 움직여 보세요. 로봇 전체가 지도에서 통째로 옮겨집니다 — 위치 추정이 오차를 고치는 모습입니다.</li>
<li><b>tf2_echo</b> 탭에서 target=<code>map</code>, source=<code>laser</code> 를 골라 두 단계를 건너뛴 변환이 자동으로 계산되는지 확인합니다.</li>
<li><b>트리</b> 탭에서 어떤 프레임이 <code>/tf_static</code>(점선)인지 찾아봅니다.</li></ol></div>
{{widget:tftree|preset=robot}}`
      },

      /* ============================================================ 4 */
      {
        title: '정적 변환과 동적 변환 · tf2_echo',
        html: `<p>변환에는 두 종류가 있습니다. 라이다처럼 <b>나사로 고정된</b> 부품은 위치가 변하지 않으니 한 번만 알려 주면 됩니다(<b>정적, static</b>). 바퀴로 움직이는 로봇 몸체나 로봇팔 관절은 계속 변하므로 주기적으로 알려야 합니다(<b>동적, dynamic</b>).</p>
{{fig:staticDyn}}
<div class="vs"><div class="vs-a green"><b>/tf_static</b><ul><li>고정된 변환 (센서 장착 위치, 고정 조인트)</li><li>QoS 내구성 <code>transient_local</code> — 나중에 켜진 리스너도 받음</li><li>시간과 무관하게 “항상 유효”</li><li>도구: <code>static_transform_publisher</code>, <code>StaticTransformBroadcaster</code></li></ul></div><div class="vs-mid">VS</div><div class="vs-b blue"><b>/tf</b><ul><li>움직이는 변환 (odom → base_link, 관절)</li><li>QoS <code>volatile</code> — 계속 새로 발행</li><li>시각(stamp)마다 저장되어 과거 값도 조회 가능</li><li>도구: <code>TransformBroadcaster</code>, robot_state_publisher</li></ul></div></div>
<h4>정적 변환을 명령 한 줄로 — static_transform_publisher</h4>
<p>“라이다가 로봇 중심에서 앞으로 10 cm, 위로 18 cm” 를 발행해 봅시다. Jazzy 에서는 이름 붙은 옵션(<code>--x --y --z --roll --pitch --yaw --frame-id --child-frame-id</code>)을 씁니다. 옛날 방식(숫자 8~9개 나열)은 경고가 나옵니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run tf2_ros static_transform_publisher --x 0.1 --z 0.18 --frame-id base_link --child-frame-id laser &amp;
ros2 topic list
ros2 topic info /tf_static -v</code></pre>
<h4>두 프레임 사이 변환 보기 — tf2_echo</h4>
<p><code>ros2 run tf2_ros tf2_echo <b>A</b> <b>B</b></code> 는 “<b>A 좌표계에서 본 B 의 위치 · 자세</b>” 를 1초마다 보여 줍니다. 첫 번째가 기준(reference), 두 번째가 알고 싶은 대상입니다. 순서를 바꾸면 값의 부호와 회전이 반대(역변환)가 됩니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run tf2_ros tf2_echo base_link laser</code></pre>
<pre class="code out" data-lang="출력"><code>At time 0.0
- Translation: [0.100, 0.000, 0.180]
- Rotation: in Quaternion [0.000, 0.000, 0.000, 1.000]
- Rotation: in RPY (radian) [0.000, 0.000, 0.000]
- Rotation: in RPY (degree) [0.000, 0.000, 0.000]</code></pre>
<div class="box warn"><div class="box-t">⚠️ 순서 주의</div><code>tf2_echo base_link laser</code> 는 Translation <code>[0.1, 0, 0.18]</code>, <code>tf2_echo laser base_link</code> 는 <code>[-0.1, 0, -0.18]</code> 입니다. 코드의 <code>lookup_transform(target_frame, source_frame)</code> 도 같은 순서(기준이 먼저)입니다.</div>
<div class="box practice"><div class="box-t">🧪 해 보기</div><ol class="steps-list">
<li>터미널에서 위 static_transform_publisher 명령을 실행하고 rqt_graph 에 노드와 <code>/tf_static</code> 이 생기는지 봅니다.</li>
<li><code>ros2 run tf2_ros tf2_echo base_link laser</code> 와 <code>tf2_echo laser base_link</code> 를 차례로 실행해 부호를 비교합니다. (Ctrl+C 로 멈춤)</li>
<li><code>ros2 topic echo /tf_static</code> 으로 실제 메시지(<code>TFMessage</code>)의 모양을 확인합니다.</li></ol></div>
{{widget:lab|with=graph|title=정적 TF 실습 — 터미널 + rqt_graph}}`
      },

      /* ============================================================ 5 */
      {
        title: 'TF 트리를 그림으로 — view_frames',
        html: `<p>프레임이 많아지면 누가 누구의 부모인지 헷갈립니다. <code>tf2_tools</code> 의 <b>view_frames</b> 는 5초 동안 /tf 와 /tf_static 을 듣고 트리를 PDF(<code>frames_날짜.pdf</code>)로 그려 줍니다. 각 화살표에 발행 노드(Broadcaster)와 평균 주기, 가장 최근 시각이 적혀 있어 “이 변환은 누가 보내나?”, “너무 느리게 오지 않나?” 를 한눈에 알 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run tf2_ros static_transform_publisher --x 0.1 --z 0.18 --frame-id base_link --child-frame-id laser &amp;
ros2 run tf2_ros static_transform_publisher --x 0.2 --z 0.12 --frame-id base_link --child-frame-id camera_link &amp;
ros2 run tf2_tools view_frames</code></pre>
<pre class="code out" data-lang="출력"><code>[INFO] [view_frames]: Listening to tf data for 5.0 seconds...
[INFO] [view_frames]: Generating graph in frames.pdf file...</code></pre>
<p>이 사이트에서는 PDF 대신 창으로 트리를 보여 줍니다. 명령줄에서 트리 상태를 계속 보고 싶으면 <code>ros2 run tf2_ros tf2_monitor</code> 도 쓸 수 있습니다(발행 노드 · 지연 시간을 출력).</p>
<div class="box tip"><div class="box-t">💡 PDF 보기</div>실제 PC 에서는 <code>evince frames_*.pdf</code> 나 파일 탐색기로 엽니다. 원격 로봇이라면 scp 로 가져오거나, RViz2 의 TF 디스플레이에서 <b>Show Names</b> 를 켜서 확인해도 됩니다.</div>
{{widget:term|chips=ros2 run tf2_ros static_transform_publisher --x 0.1 --z 0.18 --frame-id base_link --child-frame-id laser &;ros2 run tf2_ros static_transform_publisher --x 0.2 --z 0.12 --frame-id base_link --child-frame-id camera_link &;ros2 run tf2_tools view_frames;ros2 run tf2_ros tf2_monitor}}`
      },

      /* ============================================================ 6 */
      {
        title: '거북이가 거북이를 따라가기 — turtle_tf2 데모',
        html: `<p>공식 TF2 튜토리얼의 명물입니다. <code>turtle_tf2_py</code> 패키지의 런치 파일 하나로 turtlesim, 브로드캐스터 2개, 리스너 1개가 켜집니다. 방향키로 turtle1 을 움직이면 turtle2 가 쫓아옵니다.</p>
{{fig:turtleTf}}
<ol class="steps-list">
<li><b>브로드캐스터</b> — <code>/turtle1/pose</code> 를 구독해 <code>world → turtle1</code> 변환을 /tf 로 발행 (turtle2 도 같은 방식)</li>
<li><b>리스너</b> — 0.1초마다 <code>lookup_transform('turtle2', 'turtle1')</code>: “turtle2 가 보기에 turtle1 은 어디?”</li>
<li><b>제어</b> — 그 위치 (x, y) 로 각속도 = 1.0 × atan2(y, x), 선속도 = 0.5 × √(x²+y²) 를 계산해 <code>/turtle2/cmd_vel</code> 발행</li></ol>
<p>실제 PC 에서는 런치 파일 한 줄이면 됩니다.</p>
<pre class="code" data-lang="bash"><code>ros2 launch turtle_tf2_py turtle_tf2_demo.launch.py
ros2 run turtlesim turtle_teleop_key</code></pre>
<p>이 페이지에는 실습 창의 turtlesim 이 이미 떠 있으므로, 런치 파일이 켜는 노드를 <b>하나씩</b> 실행해 같은 데모를 만듭니다(런치 파일 안에 적힌 것과 같은 명령입니다). 리스너는 켜지면서 <code>/spawn</code> 서비스로 turtle2 를 만듭니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run turtle_tf2_py turtle_tf2_broadcaster --ros-args -r __node:=broadcaster1 -p turtlename:=turtle1 &amp;
ros2 run turtle_tf2_py turtle_tf2_broadcaster --ros-args -r __node:=broadcaster2 -p turtlename:=turtle2 &amp;
ros2 run turtle_tf2_py turtle_tf2_listener --ros-args -r __node:=listener -p target_frame:=turtle1</code></pre>
<p>turtle2 기준 좌표에서 turtle1 은 처음에 멀리 있다가, 따라잡을수록 Translation 이 0 에 가까워집니다(아래 작은 터미널의 <code>tf2_echo turtle2 turtle1</code> 칩). 이번에는 turtle1 에 <b>당근(carrot1)</b> 프레임을 붙여, turtle2 가 turtle1 이 아니라 “turtle1 왼쪽 2 m 지점”을 따라가게 해 봅시다. 프레임 하나를 추가하고 리스너의 목표만 바꿨을 뿐인데 행동이 바뀝니다. (실제 PC: <code>ros2 launch turtle_tf2_py turtle_tf2_fixed_frame_demo.launch.py</code>)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run turtle_tf2_py fixed_frame_tf2_broadcaster &amp;
ros2 run turtle_tf2_py turtle_tf2_listener --ros-args -r __node:=listener -p target_frame:=carrot1</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 터미널 + turtlesim</div><ol class="steps-list">
<li>첫 번째 코드 블록의 <b>▶ 터미널에서 실행</b> 을 누르고, turtlesim 화면의 방향 버튼으로 turtle1 을 움직입니다.</li>
<li>아래 작은 터미널에서 <code>tf2_echo turtle2 turtle1</code> 칩을 눌러 두 거북이 사이 거리를 봅니다.</li>
<li>두 번째 코드 블록을 실행하면 앞의 리스너가 멈추고 carrot1 을 따라가는 리스너가 켜집니다. turtle2 가 어디를 향하는지 봅니다.</li>
<li><code>view_frames</code> 칩으로 <code>world → turtle1 → carrot1</code>, <code>world → turtle2</code> 트리를 확인합니다.</li></ol></div>
{{widget:lab|with=turtlesim|title=turtle_tf2 — 따라가는 거북이}}
{{widget:term|chips=ros2 run tf2_ros tf2_echo turtle2 turtle1;ros2 run tf2_ros tf2_echo turtle2 carrot1;ros2 run tf2_tools view_frames|h=220}}
<div class="box note"><div class="box-t">📝 TF 놀이터로 3D 보기</div>3절의 TF 놀이터 위쪽 <b>거북이 (turtle_tf2)</b> 버튼을 누르면 같은 트리(world · turtle1 · turtle2 · carrot1)를 3D 로 볼 수 있습니다. 다만 놀이터도 같은 이름의 프레임을 직접 발행하므로, 위 데모를 돌리는 동안에는 놀이터를 <b>모바일 로봇</b> 프리셋으로 두세요. 한 프레임을 두 노드가 발행하면 거북이가 이리저리 튑니다(9절 “부모가 둘” 오류).</div>`
      },

      /* ============================================================ 7 */
      {
        title: '파이썬으로 브로드캐스터 · 리스너 만들기',
        html: `<p>이제 직접 만들어 봅시다. TF2 파이썬 API 는 세 가지만 알면 됩니다.</p>
<table class="tbl">
<tr><th>클래스</th><th>하는 일</th><th>핵심 메서드</th></tr>
<tr><td><code>TransformBroadcaster</code></td><td>동적 변환을 <code>/tf</code> 로 발행</td><td><code>sendTransform(TransformStamped)</code></td></tr>
<tr><td><code>StaticTransformBroadcaster</code></td><td>정적 변환을 <code>/tf_static</code> 으로 한 번 발행</td><td><code>sendTransform(...)</code></td></tr>
<tr><td><code>Buffer</code> + <code>TransformListener</code></td><td>/tf · /tf_static 을 구독해 저장하고 질문에 답함</td><td><code>lookup_transform(target, source, time)</code></td></tr>
</table>
<h4>① 브로드캐스터 — 거북이 pose → TF</h4>
<p><code>TransformStamped</code> 의 네 칸만 채우면 됩니다: <code>header.stamp</code>(지금 시각), <code>header.frame_id</code>(부모 = world), <code>child_frame_id</code>(자식 = turtle1), <code>transform</code>(위치 + 쿼터니언). turtlesim 의 <code>theta</code>(yaw) 를 쿼터니언으로 바꾸는 부분을 눈여겨보세요.</p>
<div class="box practice"><div class="box-t">🧪 해 보기</div><ol class="steps-list">
<li><b>▶ 실행</b> 을 누르고 거북이를 움직입니다.</li>
<li>이 페이지의 터미널(위 절의 실습 창 또는 코드 블록의 ▶ 버튼)에서 <code>ros2 run tf2_ros tf2_echo world turtle1</code> 로 값이 바뀌는지 확인합니다.</li>
<li><code>t.header.frame_id</code> 를 <code>'map'</code> 으로 바꿔 실행하면 <code>tf2_echo world turtle1</code> 이 “frame does not exist” 로 바뀌는 것을 봅니다.</li></ol></div>
{{widget:pylab|ex=tf_broadcaster}}
<h4>② 리스너 — turtle2 가 turtle1 을 따라가기</h4>
<p>리스너는 <code>Buffer</code> 를 만들고 <code>TransformListener(buffer, node)</code> 로 연결합니다. 그 다음 타이머에서 <code>lookup_transform('turtle2', 'turtle1', rclpy.time.Time())</code> 을 부릅니다. <code>Time()</code>(0초)은 “가장 최근 값”을 뜻합니다. 아직 변환이 도착하지 않았을 수 있으므로 <b>반드시 try / except TransformException</b> 으로 감쌉니다.</p>
{{widget:pylab|ex=tf_listener}}
<h4>③ 정적 브로드캐스터 + 점 변환을 한 프로그램으로</h4>
<p>아래 프로그램은 <code>base_link → laser_front</code>(앞쪽에 30° 돌려 단 두 번째 라이다)를 정적으로 발행하고, 1초마다 그 변환을 조회해 “라이다가 본 점 (1.5, 0, 0)” 을 base_link 좌표로 직접 바꿔 봅니다. 쿼터니언으로 벡터를 돌리는 공식 <code>v' = v + 2w(q×v) + 2q×(q×v)</code> 도 들어 있습니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="term"><code>import math
import rclpy
from rclpy.node import Node
from rclpy.time import Time
from geometry_msgs.msg import TransformStamped
from tf2_ros import TransformException
from tf2_ros.buffer import Buffer
from tf2_ros.transform_listener import TransformListener
from tf2_ros.static_transform_broadcaster import StaticTransformBroadcaster


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def rotate(q, v):
    """쿼터니언 q=(x,y,z,w) 로 벡터 v 를 회전"""
    u = (q[0], q[1], q[2])
    t = [2 * c for c in cross(u, v)]
    c2 = cross(u, t)
    return tuple(v[i] + q[3] * t[i] + c2[i] for i in range(3))


class LaserPoint(Node):
    def __init__(self):
        super().__init__('laser_point_demo')
        self.static_br = StaticTransformBroadcaster(self)
        t = TransformStamped()
        t.header.stamp = self.get_clock().now().to_msg()
        t.header.frame_id = 'base_link'
        t.child_frame_id = 'laser_front'
        t.transform.translation.x = 0.10
        t.transform.translation.z = 0.20
        yaw = math.radians(30)            # 라이다를 왼쪽으로 30도 돌려 달았다고 가정
        t.transform.rotation.z = math.sin(yaw / 2)
        t.transform.rotation.w = math.cos(yaw / 2)
        self.static_br.sendTransform(t)

        self.buffer = Buffer()
        self.listener = TransformListener(self.buffer, self)
        self.create_timer(1.0, self.on_timer)

    def on_timer(self):
        try:
            tf = self.buffer.lookup_transform('base_link', 'laser_front', Time())
        except TransformException as ex:
            self.get_logger().info(f'아직 변환이 없습니다: {ex}')
            return
        r = tf.transform.rotation
        p = tf.transform.translation
        v = rotate((r.x, r.y, r.z, r.w), (1.5, 0.0, 0.0))
        x, y, z = v[0] + p.x, v[1] + p.y, v[2] + p.z
        self.get_logger().info(f'laser_front (1.50, 0.00, 0.00) → base_link ({x:.2f}, {y:.2f}, {z:.2f})')


def main():
    rclpy.init()
    rclpy.spin(LaserPoint())


if __name__ == '__main__':
    main()</code></pre>
<p>실행하면 <code>base_link (1.40, 0.75, 0.20)</code> 이 찍힙니다. 1.5 m 를 30° 돌리면 (1.30, 0.75), 여기에 장착 위치 (0.1, 0, 0.2) 를 더한 값입니다. 실제 코드에서는 이 계산을 <code>tf2_geometry_msgs</code> 를 불러 <code>self.buffer.transform(point_stamped, 'base_link')</code> 한 줄로 끝냅니다.</p>
{{widget:pylab|ex=static_tf}}`
      },

      /* ============================================================ 8 */
      {
        title: '점 변환의 감 잡기 · RViz 에서 TF 보기',
        html: `<p>TF 가 실제로 하는 계산을 한 번 손으로 따라가 봅시다. 로봇이 지도의 (2.0, 1.0) 에서 북쪽(yaw 90°)을 보고 있고, 라이다는 몸체 중심에서 0.1 m 앞에 달려 있습니다. 라이다가 “정면 1.5 m” 에 장애물을 봤습니다.</p>
{{fig:pointXf}}
<ol class="steps-list">
<li><b>laser → base_link</b>: 라이다는 회전 없이 0.1 m 앞에 있으니 x 에 0.1 을 더해 (1.6, 0).</li>
<li><b>base_link → map 회전</b>: 90° 돌리면 (x, y) → (−y, x) 이므로 (0.0, 1.6).</li>
<li><b>base_link → map 이동</b>: 로봇 위치 (2.0, 1.0) 을 더해 (2.0, 2.6). 장애물은 로봇의 북쪽 1.6 m 입니다.</li></ol>
<p>수학으로는 4×4 동차 변환 행렬을 곱하는 것(<code>T_map←laser = T_map←odom · T_odom←base · T_base←laser</code>)입니다. TF2 는 트리에서 두 프레임을 잇는 길을 찾아 이 곱셈을 자동으로 해 주고, <b>시간</b>까지 맞춰 줍니다 — 라이다가 측정한 그 순간의 로봇 위치를 써야 하기 때문입니다.</p>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — “언제의” 변환인가</div>센서 데이터를 변환할 때는 <code>lookup_transform(target, source, msg.header.stamp)</code> 처럼 <b>메시지의 시각</b>을 넘기는 것이 정석입니다. 로봇이 빠르게 돌 때 “지금” 변환을 쓰면 벽이 휘어져 보입니다. 이 사이트의 파이썬 실습은 단순하게 <code>Time()</code>(최신값)을 씁니다.</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — RViz2 에서 TF 보기</div><ol class="steps-list">
<li>RViz 의 Fixed Frame 이 <code>world</code> 인지 확인합니다. (Fixed Frame = 화면의 기준 좌표계)</li>
<li>turtlesim 과 함께 world → turtle1 축이 그려집니다. 거북이를 움직여 빨강(x) 축이 거북이 머리 방향과 같은지 봅니다.</li>
<li>TF 디스플레이의 이름 표시를 켜고 끄며, 축 색(x 빨강 · y 초록 · z 파랑)을 익힙니다.</li></ol></div>
{{widget:rviz|fixed=world|show=tf|with=turtle}}`
      },

      /* ============================================================ 9 */
      {
        title: '자주 만나는 TF 오류와 해결',
        html: `<p>TF 오류 메시지는 길지만 패턴은 몇 가지뿐입니다. 메시지의 핵심 단어로 원인을 찾아보세요.</p>
<table class="tbl">
<tr><th>메시지(핵심 부분)</th><th>원인</th><th>확인 · 해결</th></tr>
<tr><td><code>"base_link" passed to lookupTransform argument target_frame does not exist</code></td><td>그 프레임을 발행하는 노드가 없음 · 이름 오타 · 앞에 <code>/</code> 를 붙임(ROS 2 프레임 이름엔 / 없음)</td><td><code>ros2 run tf2_tools view_frames</code> 로 트리에 있는지 확인. 아직 안 켜졌을 수 있으니 잠시 기다리거나 timeout 사용</td></tr>
<tr><td><code>Lookup would require extrapolation into the future</code> / <code>into the past</code></td><td>요청한 시각의 변환이 버퍼에 없음. 발행이 느리거나, 시계가 다름(<code>use_sim_time</code> 불일치)</td><td><code>ros2 topic hz /tf</code>, 모든 노드의 <code>use_sim_time</code> 을 같게. 최신값이면 <code>Time()</code> 사용</td></tr>
<tr><td><code>not part of the same tree. Tf has two or more unconnected trees</code></td><td>트리가 둘로 끊김. 예: <code>map → odom</code> 을 보내는 노드(AMCL/SLAM)가 없음</td><td>view_frames 로 끊긴 곳을 찾고 빠진 변환(정적이면 static_transform_publisher)을 채움</td></tr>
<tr><td>로봇이 화면에서 두 위치를 번갈아 깜빡임</td><td>한 프레임을 <b>두 노드</b>가 발행(부모가 둘)</td><td>view_frames 의 Broadcaster 를 보고 하나를 끔 (예: EKF 와 diff_drive 가 둘 다 odom→base_link)</td></tr>
<tr><td><code>TF_OLD_DATA ignoring data from the past</code></td><td>bag 재생 후 시간이 되감김, 또는 시계 역행</td><td>RViz 에서 <b>Reset</b>, bag 재생은 <code>--clock</code> 과 <code>use_sim_time:=true</code></td></tr>
</table>
<p>직접 오류를 만들어 봅시다. 없는 프레임 <code>wheel_left</code> 를 물으면 “frame does not exist” 가 나오고, 정적 변환을 켜는 순간 값이 찍히기 시작합니다. <code>odom → base_link</code> 는 3절의 TF 놀이터가 발행하고 있으므로, <code>base_link → wheel_left</code> 한 칸만 이으면 <code>odom → wheel_left</code> 가 두 단계를 건너 자동 계산됩니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run tf2_ros tf2_echo odom wheel_left</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run tf2_ros static_transform_publisher --y 0.15 --frame-id base_link --child-frame-id wheel_left &amp;
ros2 run tf2_ros tf2_echo odom wheel_left</code></pre>
<p>이 페이지에는 <code>map</code> 이 뿌리인 로봇 트리(3절)와 <code>world</code> 가 뿌리인 거북이 트리(2 · 6절)가 <b>따로</b> 있습니다. <code>tf2_echo map world</code> 는 두 트리를 잇는 변환이 없어 실패합니다 — “two unconnected trees” 상황을 직접 확인해 보세요.</p>
<div class="box tip"><div class="box-t">💡 디버깅 순서</div>① <code>view_frames</code> 로 트리 모양 → ② <code>tf2_echo</code> 로 값 · 부호 → ③ <code>ros2 topic hz /tf</code> 로 주기 → ④ RViz TF 디스플레이로 눈으로 확인. 이 네 단계면 대부분의 TF 문제가 풀립니다.</div>
{{widget:term|chips=ros2 run tf2_ros tf2_echo odom wheel_left;ros2 run tf2_ros static_transform_publisher --y 0.15 --frame-id base_link --child-frame-id wheel_left &;ros2 run tf2_ros tf2_echo map world;ros2 run tf2_tools view_frames}}`
      }
    ],

    videos: [
      { title: 'The ROS Transform System (TF) | Getting Ready to Build Robots with ROS #6', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=QyvHhY4Y_Y8', lang: 'en', min: '20분', desc: 'TF 가 왜 필요한지, static_transform_publisher 와 RViz 로 프레임을 눈으로 확인하는 과정을 차근차근 보여 줍니다.' },
      { title: 'ROS2 Tutorial: Understand Static and Dynamic Transforms + Creating Custom Frames using TF2-library', channel: 'Easy Peasy Robotics', url: 'https://www.youtube.com/watch?v=hZQWsYAZ58M', lang: 'en', min: '20분', desc: '정적 · 동적 변환의 차이와 사용자 프레임 추가를 코드로 따라 합니다.' },
      { title: 'ROS2 tf2 Tutorial - Adding a Frame Python', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=F1BAm6Nf5Ec', lang: 'en', min: '15분', desc: 'turtle_tf2 튜토리얼의 carrot 프레임 추가를 파이썬으로 구현하는 영상입니다.' },
      { title: 'All you need to know about TF and TF2 in ROS | Tutorial', channel: 'Soft illusion', url: 'https://www.youtube.com/watch?v=_t4HZ8r_qFM', lang: 'en', min: '20분', desc: '변환 행렬 · 트리 · 버퍼의 개념을 그림 위주로 정리합니다 (ROS 1 예제지만 개념은 같음).' },
      { title: '"ROS 2 TF2 좌표 변환" 영상 찾아보기', url: 'https://www.youtube.com/results?search_query=ROS+2+TF2+%EC%A2%8C%ED%91%9C+%EB%B3%80%ED%99%98', lang: 'ko', desc: '한국어 설명 영상을 찾아 복습해 보세요.' }
    ],

    terms: [
      ['TF2', 'ROS 의 좌표 변환 라이브러리. 모든 프레임을 트리로 관리하고 아무 두 프레임 사이 변환을 시간과 함께 계산'],
      ['프레임(frame)', '원점과 x · y · z 축 한 벌로 이루어진 좌표계. frame_id 이름으로 부름 (예: base_link)'],
      ['변환(transform)', '부모 프레임에서 본 자식 프레임의 위치(translation)와 자세(rotation). geometry_msgs/msg/TransformStamped'],
      ['REP 103', '표준 단위(m · rad · s)와 좌표 규약(x 앞 · y 왼쪽 · z 위, 오른손 좌표계)을 정한 문서'],
      ['REP 105', '모바일 로봇 프레임 이름과 관계(map → odom → base_link)를 정한 문서'],
      ['쿼터니언(quaternion)', '회전을 (x, y, z, w) 네 숫자로 나타내는 방법. 짐벌 락이 없고 길이는 항상 1'],
      ['짐벌 락(gimbal lock)', '오일러 각에서 pitch ±90° 일 때 두 회전축이 겹쳐 자유도 하나를 잃는 현상'],
      ['map / odom', 'map = 지도 고정 좌표(정확하지만 점프 가능), odom = 오도메트리 좌표(연속이지만 드리프트)'],
      ['base_link / base_footprint', '로봇 몸체 좌표 / 그 점을 바닥(z=0)에 투영한 좌표'],
      ['/tf_static', '고정 변환용 토픽. transient_local QoS 로 늦게 켜진 리스너도 받음'],
      ['브로드캐스터(broadcaster)', '변환을 /tf 나 /tf_static 에 발행하는 쪽 (TransformBroadcaster, StaticTransformBroadcaster)'],
      ['리스너(listener) · Buffer', '/tf 를 구독해 일정 시간(기본 10초) 변환을 저장하고 lookup_transform 질문에 답하는 쪽'],
      ['tf2_echo', 'ros2 run tf2_ros tf2_echo A B — A 기준에서 본 B 의 변환을 출력하는 도구'],
      ['view_frames', 'ros2 run tf2_tools view_frames — TF 트리를 PDF 로 그려 주는 도구']
    ],

    summary: [
      '로봇의 센서 · 몸체 · 지도는 각자 좌표계(프레임)를 가지며, TF2 가 이들을 트리로 이어 아무 두 프레임 사이 변환을 계산해 준다.',
      'REP 103: x 앞 · y 왼쪽 · z 위의 오른손 좌표계, 단위는 m · rad. 회전은 쿼터니언 (x, y, z, w) 로 저장한다 (yaw 만 쓰면 z = sin(θ/2), w = cos(θ/2)).',
      'REP 105: map → odom(위치 추정) → base_link(오도메트리) → 센서(robot_state_publisher, 정적). 한 프레임의 부모는 하나.',
      '고정된 변환은 /tf_static(transient_local, 한 번), 움직이는 변환은 /tf(계속). static_transform_publisher 는 --x … --frame-id … --child-frame-id … 로 쓴다.',
      'tf2_echo A B 와 lookup_transform(A, B) 는 모두 “A 기준에서 본 B” — 기준 프레임이 먼저다.',
      'rclpy 에서는 TransformBroadcaster · StaticTransformBroadcaster 로 보내고, Buffer + TransformListener 로 받아 try/except TransformException 안에서 조회한다.',
      'TF 오류는 “frame does not exist · extrapolation · 두 트리 · 부모가 둘” 네 가지가 대부분이며, view_frames → tf2_echo → topic hz 순서로 찾는다.'
    ],

    quiz: [
      { q: 'REP 103 에 따른 로봇 몸체(base_link) 좌표축 방향으로 옳은 것은?', options: ['x 오른쪽 · y 앞 · z 위', 'x 앞 · y 왼쪽 · z 위', 'x 앞 · y 오른쪽 · z 아래', 'x 위 · y 왼쪽 · z 앞'], answer: 1, explain: 'ROS 는 오른손 좌표계로 x 앞 · y 왼쪽 · z 위를 씁니다. z 앞 · x 오른쪽 · y 아래는 카메라 광학(_optical) 프레임의 규약입니다.' },
      { q: 'yaw 90° 회전을 나타내는 쿼터니언 (x, y, z, w) 는?', options: ['(0, 0, 1, 0)', '(0, 0, 0, 1)', '(0, 0, 0.707, 0.707)', '(0.707, 0, 0, 0.707)'], answer: 2, explain: 'z 축으로 θ 회전은 (0, 0, sin(θ/2), cos(θ/2)). θ=90° 이면 sin45° = cos45° ≈ 0.707 입니다. (0,0,0,1) 은 회전 없음, (0,0,1,0) 은 180° 입니다.' },
      { q: 'REP 105 에서 map → odom 변환을 보통 발행하는 것은?', options: ['robot_state_publisher', 'diff_drive_controller 의 오도메트리', 'AMCL · slam_toolbox 같은 위치 추정 노드', 'static_transform_publisher'], answer: 2, explain: '위치 추정 노드가 오도메트리의 누적 오차를 보정하는 양을 map → odom 으로 발행합니다. odom → base_link 는 오도메트리, 센서 프레임은 robot_state_publisher 담당입니다.' },
      { q: '/tf_static 토픽이 transient_local 내구성을 쓰는 이유는?', options: ['메시지를 더 빨리 보내려고', '나중에 켜진 리스너도 한 번만 발행된 고정 변환을 받을 수 있게', '메시지를 암호화하려고', '여러 노드가 같은 프레임을 발행하지 못하게'], answer: 1, explain: '정적 변환은 한 번만 발행됩니다. transient_local 은 발행자가 마지막 값을 보관했다가 늦게 연결된 구독자에게도 보내 줍니다.' },
      { q: 'ros2 run tf2_ros tf2_echo base_link laser 의 출력이 뜻하는 것은?', options: ['laser 기준에서 본 base_link 의 위치', 'base_link 기준에서 본 laser 의 위치 · 자세', '두 프레임의 절대 위치 차이의 크기', 'laser 토픽의 메시지 내용'], answer: 1, explain: '첫 번째 인자가 기준(target) 프레임, 두 번째가 대상(source) 프레임입니다. lookup_transform(target, source) 와 같은 순서입니다.' },
      { q: '“Tf has two or more unconnected trees” 오류가 났을 때 가장 먼저 할 일은?', options: ['RViz 를 다시 설치한다', 'view_frames 로 트리가 어디서 끊겼는지 보고 빠진 변환을 채운다', '모든 쿼터니언을 (0,0,0,0) 으로 바꾼다', 'ROS_DOMAIN_ID 를 바꾼다'], answer: 1, explain: '두 프레임을 잇는 길이 없다는 뜻입니다. 예를 들어 위치 추정이 꺼져 map → odom 이 없는 경우가 흔합니다. view_frames 로 끊긴 곳을 확인하세요.' },
      { q: '리스너 코드에서 lookup_transform 을 try/except TransformException 으로 감싸는 이유로 가장 알맞은 것은?', options: ['파이썬 문법상 반드시 필요해서', '노드가 켜진 직후에는 아직 변환이 버퍼에 없어 예외가 날 수 있으므로', '쿼터니언 계산이 느려서', 'TransformListener 가 서비스라서'], answer: 1, explain: '리스너가 /tf 를 받기 전이나 브로드캐스터가 아직 안 켜졌을 때 LookupException 등이 납니다. 예외를 잡아 다음 주기에 다시 시도하는 것이 정석입니다.' }
    ],

    slides: [
      { title: '같은 장애물, 다른 숫자', html: `{{fig:frames|nocap}}`, notes: '라이다 · 카메라 · 몸체가 같은 장애물을 서로 다른 숫자로 본다는 것을 보여 줍니다. “이 숫자를 지도 좌표로 바꾸려면 무엇을 알아야 할까요?” 하고 물어 봅니다. (3분)' },
      { title: 'TF2 가 하는 일', layout: 'center', html: `<div class="s-big">각 노드는 <b>아는 변환 하나</b>만 알리고<br>필요한 노드는 <b>“A 기준 B 는 어디?”</b> 라고 묻는다</div>{{fig:tfFlow|nocap}}`, notes: '브로드캐스터 → 버퍼 → 리스너 흐름을 설명합니다. 여러 단계 변환도 TF2 가 곱해서 한 번에 준다는 점을 강조합니다. (2분)' },
      { title: 'REP 103 — 축과 단위', html: `{{fig:rep103|nocap}}`, notes: '오른손을 들어 엄지 x, 검지 y, 중지 z 를 학생들과 함께 만들어 봅니다. yaw + 는 위에서 봤을 때 반시계 방향이라는 점을 손으로 보여 줍니다. (4분)' },
      { title: '왜 쿼터니언?', html: `<div class="s-cols"><div><b>오일러 (RPY)</b><ul class="s-points"><li>읽기 쉬움</li><li>순서 따라 결과 다름</li><li>짐벌 락</li></ul></div><div><b>쿼터니언 (x,y,z,w)</b><ul class="s-points"><li>축 × sin(θ/2), cos(θ/2)</li><li>짐벌 락 없음</li><li>회전 없음 = (0,0,0,1)</li></ul></div></div>`, notes: '수식보다 직관: “한 축을 정하고 그 축으로 얼마나 돌았나”. 평면 로봇은 z=sin(yaw/2), w=cos(yaw/2) 만 알면 된다고 정리합니다. (4분)' },
      { title: 'REP 105 — map · odom · base_link', html: `{{fig:rep105|nocap}}`, notes: 'map 은 정확하지만 점프, odom 은 부드럽지만 드리프트. 그래서 둘 다 필요하다는 것을 설명합니다. 부모는 하나뿐이라는 규칙이 두 변환을 나눈 이유입니다. (5분)' },
      { title: 'TF 놀이터', html: `{{widget:tftree|preset=robot}}`, notes: 'map → odom 슬라이더를 움직여 “위치 추정이 오차를 고치는 모습”을 보여 줍니다. tf2_echo 탭에서 map → laser 를 골라 여러 단계가 자동 계산되는 것을 확인합니다. (5분)' },
      { title: '/tf 와 /tf_static', html: `{{fig:staticDyn|nocap}}`, notes: '고정 부품은 /tf_static 으로 한 번, 움직이는 것은 /tf 로 계속. transient_local 덕분에 나중에 켠 RViz 도 센서 위치를 안다는 점을 짚습니다. (3분)' },
      { title: 'tf2_echo — 순서가 중요', layout: 'center', html: `<div class="s-big"><code>tf2_echo <b>A</b> <b>B</b></code><br>= <b>A 기준</b>에서 본 <b>B</b></div><div class="s-small">lookup_transform(target=A, source=B) 와 같은 순서</div>`, notes: 'tf2_echo base_link laser 와 laser base_link 를 실제로 실행해 부호가 반대로 나오는 것을 보여 줍니다. (3분)' },
      { title: '따라가는 거북이', html: `{{fig:turtleTf|nocap}}`, notes: 'turtle_tf2_demo 의 노드 구성입니다. 리스너가 turtle2 기준 turtle1 위치를 묻고 atan2 로 방향, 거리로 속도를 계산한다는 점을 설명합니다. (3분)' },
      { title: '거북이 TF 트리 (3D)', html: `{{widget:tftree|preset=turtle}}`, notes: 'world 아래 turtle1 · turtle2, turtle1 아래 carrot1 이 붙은 트리를 3D 로 봅니다. carrot1 슬라이더를 움직이면 turtle2 가 따라가는 목표가 바뀝니다. 이 놀이터도 같은 프레임을 발행하므로 실제 데모와 동시에 켜지 않습니다. (4분)' },
      { title: '실습: turtle_tf2', html: `{{widget:lab|with=turtlesim}}`, notes: '실제 PC 에서는 ros2 launch turtle_tf2_py turtle_tf2_demo.launch.py 한 줄입니다. 이 페이지에서는 본문 6절의 코드 블록으로 브로드캐스터 2개와 리스너를 켜고 turtle1 을 움직여 봅니다. 이어서 carrot1 을 따라가게 합니다. (8분)' },
      { title: '파이썬 브로드캐스터', html: `{{widget:pylab|ex=tf_broadcaster}}`, notes: 'TransformStamped 의 네 칸(stamp, frame_id, child_frame_id, transform)을 짚고, theta 를 쿼터니언으로 바꾸는 부분을 설명합니다. 실행 후 tf2_echo world turtle1 로 확인합니다. (8분)' },
      { title: '점 변환 손으로 계산', html: `{{fig:pointXf|nocap}}`, notes: '라이다 (1.5, 0) → base_link (1.6, 0) → 90° 회전 (0, 1.6) → 이동 (2.0, 2.6). 칠판에 같이 계산해 보고 “TF2 는 이걸 매 순간 자동으로 한다”고 마무리합니다. (5분)' },
      { title: 'TF 오류 네 가지', html: `<ul class="s-points"><li><b>frame does not exist</b> — 발행 노드 없음 · 오타 · 앞의 /</li><li><b>extrapolation</b> — 시각 불일치 · use_sim_time</li><li><b>two unconnected trees</b> — 끊긴 변환</li><li><b>부모가 둘</b> — 두 노드가 같은 프레임 발행</li></ul>`, notes: '오류 메시지의 핵심 단어로 원인을 찾는 연습을 합니다. 디버깅 순서: view_frames → tf2_echo → topic hz → RViz. (4분)' }
    ]
  });
})();
