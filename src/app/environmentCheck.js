// Script comum (não é módulo), então roda mesmo quando o módulo principal não carrega.
// O caso típico: abrir o index.html com duplo clique (file://). O navegador bloqueia módulos ES
// nesse modo e a página fica vazia, sem explicação.
(function () {
  var status = document.getElementById('status');
  if (status && window.location.protocol === 'file:') {
    status.textContent = 'Não abra o arquivo direto. No terminal rode "npm start" e acesse http://127.0.0.1:8080';
  }
})();
