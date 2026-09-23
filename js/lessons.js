/* 강의 파일 불러오기 — 목차(course.js)의 chNN 마다 lessons/chNN.js 를 읽는다.
   (document.write 는 문서를 읽는 중에만 쓰므로 다음 <script> 보다 먼저 실행된다) */
(function () {
  Course.order().filter(id => /^ch\d+$/.test(id)).forEach(id => {
    document.write('<script src="lessons/' + id + '.js"><\/script>');
  });
})();
