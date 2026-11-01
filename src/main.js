import { Application } from './app/Application.js';

Application.start().catch((error) => {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = `Erro ao iniciar: ${error.message}`;
  }
  console.error(error);
});
