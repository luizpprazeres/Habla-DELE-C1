# Habla DELE C1

## Design Context
Aplicativo pessoal de estudo de espanhol para Luiz e Alana. Prova escrita DELE C1 em 14/11/2026, Recife. Uso prioritário no celular, em intervalos de 10–15 minutos e blocos de 60 minutos. Luiz precisa desenvolver escrita e fala; Alana tem certificado B2. Público quer praticidade e feedback construtivo, sem pressão ou promessas de aprovação.

Direção explícita: preto vivo (#050505 como base), elementos e ações em laranja, contraste alto, tipografia sem serifa, legibilidade e atenção. Uma tarefa por vez é a variante preferida. A página é ferramenta de estudo, não landing page; preserve espaço para leitura e produção. Motion mínimo. Preserve labels principais Meu dia/Praticar/Evolução/Referências, perfis, acesso compartilhado e histórico real. Não invente métricas, streaks, notas oficiais ou aprovação. A jornada cooperativa reconhece prática, reescrita e diálogo com celebrações entre os perfis, sem competição. San Sebastián/Donostia é a referência principal, com Bilbao e Santiago; hospitais e belas igrejas entram como contexto cultural discreto, independente da prova.

Stack: JavaScript vanilla + CSS nativo, Cloudflare Workers/D1. Preserve stack e dependências leves. Credenciais e dados privados em .dev.vars, private/, .wrangler/ e artifacts/ NÃO devem ser lidos ou enviados a outros serviços. Não publicar, fazer git commit/push ou tocar no banco; o agente central fará revisão e publicação.
