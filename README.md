# Habla — Tutor DELE C1

Aplicação pessoal para Luiz e Alana, com histórico independente por perfil, diagnóstico inicial em quatro habilidades, tarefas originais, respostas escritas e gravadas, correção construtiva e revisão. Prova escrita prevista para 14/11/2026 em Recife. Confirmar a data da prova oral na convocatória do centro.

## Rodar e publicar

Node.js e npm são necessários. Execute `npm install`, `npm run db:local` e `npm run dev`. O desenvolvimento usa `.dev.vars`, ignorado pelo repositório, com `OPENAI_API_KEY` e `LOCAL_DEV=true`. Nunca configure `LOCAL_DEV` em produção.

O projeto usa Cloudflare Workers com arquivos estáticos e D1. A configuração está em `wrangler.jsonc`. Para publicar: login oficial do Wrangler, aplicar `npx wrangler d1 migrations apply DB --remote`, executar `npm run deploy` e cadastrar `OPENAI_API_KEY` e `APP_ACCESS_KEY` como segredos com `wrangler secret put`. O arquivo local `private/access.key` guarda o acesso compartilhado e não deve ser publicado. O link abre com `#access=SEGREDO`; o navegador remove o fragmento após criar o cookie de acesso. Ambos podem escolher qualquer perfil, sem contas individuais.

## Rotina prática

Começar com uma amostra de leitura, escuta, escrita e fala para cada pessoa. A triagem orienta os treinos e não certifica nível. Luiz tem quatro blocos semanais de 60 minutos; Alana, cinco ou seis. Ambos acrescentam 10–15 minutos por dia. As tarefas curtas treinam um recorte; os blocos permitem produção mais extensa. A geração considera o contexto do perfil e suas seis últimas correções. A versão `c1-v2` fixa recortes mais exigentes, alterna subtipos, valida extensão, evidências e distratores e exige resolução cega nas questões objetivas e revisão em chamada separada antes de publicar. Havendo rejeição, tenta reparar até duas vezes; atividades anteriores continuam acessíveis como aquecimento.

Responder primeiro, revisar até três prioridades, tentar novamente e voltar aos erros no dia seguinte. Na fala, responder também à pergunta de seguimento para desenvolver interação. Reservar os modelos oficiais cronometrados e sessões com professor para calibrar o feedback. Esta versão não aplica um simulado completo nem calcula probabilidade de aprovação.

## Limites e custos

As chamadas OpenAI usam o saldo da API do usuário. O limite de 40 chamadas por dia é compartilhado pelos dois perfis, inclui geração, correção, voz e transcrição, e não constitui um teto financeiro. Criar leitura/escuta usa pelo menos três chamadas; produção usa pelo menos duas. Reparos e tentativas com falha também consomem chamadas. As tarefas usam GPT-5.5 e a verificação usa GPT-5.4; as correções usam GPT-5.4 mini; escuta usa voz sintética, claramente identificada.

Sem ativar R2, as gravações ficam no D1: até 900 KB por arquivo e 20 MB no conjunto. A gravação no navegador tenta usar 24 kbps e para em cinco minutos. Arquivos importados de maior qualidade podem exceder esse limite. O backend também aceita uma futura binding R2 `AUDIO`, ainda não configurada. Não há exclusão automática de gravações. Áudios de estímulo são reutilizados no navegador e, quando cabem, em cache separado no D1, dividido em partes de até 900 KB (até 10 MB por áudio e 20 MB no conjunto). A exportação JSON inclui perfis, tarefas e respostas; baixar áudios individualmente no histórico.

O feedback da fala analisa a transcrição revisada pelo aluno; não avalia pronúncia ou fluidez. As bandas são estimativas não calibradas. Gabaritos objetivos exigem evidência literal na fonte e revisão automática; ambas podem errar e não garantem a qualidade pedagógica. Os detalhes dos recortes e limites estão em [docs/PEDAGOGIA.md](docs/PEDAGOGIA.md).

O cronômetro mede uma estimativa de tempo ativo: pausa ao ocultar a página, sair da tarefa ou após três minutos sem interação. Rascunhos e tempo ficam neste navegador, sem somar o intervalo até o dia seguinte. A leitura sem interação pode exigir retomar o contador.

## Fontes oficiais

[Guia DELE C1 atualizado em 2024](https://examenes.cervantes.es/sites/default/files/Guia_examen_DELE_C1_2024_0.pdf) e [modelos oficiais e preparação](https://examenes.cervantes.es/es/dele/preparar-prueba). As tarefas geradas no aplicativo são material original de treino e não questões oficiais.

## Verificação

`npm test` verifica recortes C1, rejeição de ambiguidade e distratores fracos na revisão, evidências, embaralhamento, privacidade do gabarito e das fontes de áudio, acesso e cronômetro. `npm run check` verifica sintaxe. Testes manuais de API real verificam geração, correção escrita, voz sintética, armazenamento e transcrição. A captura física do microfone no celular precisa ser validada no aparelho de cada usuário.

## Jornada a dois

A versão 0.3.0 reconhece a primeira resposta, a prática de habilidades diferentes, a primeira reescrita e o primeiro diálogo continuado. Uma reescrita precisa mudar o texto e estar vinculada à correção anterior. O objetivo semanal cooperativo pede duas tarefas distintas e uma reescrita ou diálogo de cada pessoa; não usa ranking, sequência diária obrigatória, pontos ou notas de aprovação. O outro perfil pode reconhecer uma conquista com uma mensagem breve. Os marcos permanecem ao mudar de semana. Esta parte usa apenas o banco, sem chamadas extras de IA.

San Sebastián/Donostia, Bilbao e Santiago de Compostela aparecem como referências culturais, com hospitais e catedrais em páginas institucionais. As referências não interferem nos exercícios. Metodologia em [docs/JORNADA.md](docs/JORNADA.md) e fontes em [docs/REFERENCIAS-CIDADES.md](docs/REFERENCIAS-CIDADES.md).

Na versão 0.3.1, o Meu dia abre com uma ilustração original de La Concha. Mensagens autorais combinam humor discreto com uma ação de estudo, escolhidas por habilidade, rascunho ou revisão. A seleção varia por dia e perfil, sem custo adicional de IA; não constitui feedback nem medida de nível. Critérios em [docs/MOTIVACAO.md](docs/MOTIVACAO.md).
