# Habla — Tutor DELE C1

Aplicação pessoal para Luiz e Alana, com histórico independente por perfil, diagnóstico inicial em quatro habilidades, tarefas originais, respostas escritas e gravadas, correção construtiva e revisão. Prova escrita prevista para 14/11/2026 em Recife. Confirmar a data da prova oral na convocatória do centro.

## Rodar e publicar

Node.js e npm são necessários. Execute `npm install`, `npm run db:local` e `npm run dev`. O desenvolvimento usa `.dev.vars`, ignorado pelo repositório, com `OPENAI_API_KEY` e `LOCAL_DEV=true`. Nunca configure `LOCAL_DEV` em produção.

O projeto usa Cloudflare Workers com arquivos estáticos e D1. A configuração está em `wrangler.jsonc`. Para publicar: login oficial do Wrangler, aplicar `npx wrangler d1 migrations apply DB --remote`, executar `npm run deploy` e cadastrar `OPENAI_API_KEY` e `APP_ACCESS_KEY` como segredos com `wrangler secret put`. O arquivo local `private/access.key` guarda o acesso compartilhado e não deve ser publicado. O link abre com `#access=SEGREDO`; o navegador remove o fragmento após criar o cookie de acesso. Ambos podem escolher qualquer perfil, sem contas individuais.

## Rotina prática

Começar com uma amostra de leitura, escuta, escrita e fala para cada pessoa. A triagem orienta os treinos e não certifica nível. Luiz tem quatro blocos semanais de 60 minutos; Alana, cinco ou seis. Ambos acrescentam 10–15 minutos por dia. As tarefas curtas treinam um recorte; os blocos permitem produção mais extensa. A geração considera o contexto do perfil e suas seis últimas correções. A versão `c1-v2` fixa recortes mais exigentes, alterna subtipos, valida extensão, evidências e distratores e exige resolução cega nas questões objetivas e revisão em chamada separada antes de publicar. Havendo rejeição, tenta reparar até duas vezes; atividades anteriores continuam acessíveis como aquecimento.

Responder primeiro, revisar até três prioridades, tentar novamente e voltar aos erros no dia seguinte. Na fala, responder também à pergunta de seguimento para desenvolver interação. Reservar os modelos oficiais cronometrados e sessões com professor para calibrar o feedback. Esta versão não aplica um simulado completo nem calcula probabilidade de aprovação.

## Limites e custos

As chamadas OpenAI usam o saldo da API do usuário. O limite de 40 chamadas por dia é compartilhado pelos dois perfis, inclui geração, correção, voz e transcrição, e não constitui um teto financeiro. Criar leitura/escuta usa pelo menos três chamadas de texto; produção usa pelo menos duas. A primeira voz acrescenta uma chamada por trecho de até 4096 caracteres; reprodução já armazenada não chama IA. Reparos e tentativas com falha também consomem chamadas. As tarefas usam GPT-5.5 e a verificação usa GPT-5.4; as correções usam GPT-5.4 mini; escuta usa voz sintética, claramente identificada.

Sem ativar R2, as gravações ficam no D1: até 900 KB por arquivo e 20 MB no conjunto. A gravação no navegador tenta usar 24 kbps e para em cinco minutos. Arquivos importados de maior qualidade podem exceder esse limite. O backend também aceita uma futura binding R2 `AUDIO`, ainda não configurada. Não há exclusão automática de gravações. Áudios de estímulo são reutilizados no navegador e, quando cabem, em cache separado no D1, dividido em partes de até 900 KB (até 10 MB por áudio e 100 MB no conjunto). A exportação JSON inclui perfis, tarefas e respostas; baixar áudios individualmente no histórico.

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

## Experiência 0.4.0: Espanha e trajetória compartilhada

O Meu dia recebe fotografia real licenciada no card do próximo treino, com fade e contraste via CSS. A cidade do dia alterna Donostia, Palma, Barcelona, Madrid, Bilbao e Santiago; San Sebastián aparece três vezes num ciclo de oito dias. O dia é comum aos dois perfis (Maceió); relógio local usa Europe/Madrid com horário de verão. Curiosidades curtas em espanhol, igrejas e hospitais têm fontes institucionais. Fotos são arquivos locais otimizados, com autor, título, licença, origem e adaptações nos créditos de Referências. Consulte `docs/ESPANHA.md`.

O clima vem da API pública Open-Meteo através do Worker: apenas coordenadas de cidades, sem dados dos alunos. É estimativa de modelo, com hora do dado; falhas aparecem como indisponível. Cache meteorológico de dez minutos; atualização no dashboard aberto e visível em intervalos de dez minutos. Esse uso pessoal sem monetização segue a modalidade gratuita; mudança de finalidade exige revisar os termos do serviço.

Evolução reúne os dois perfis: totais por habilidade no histórico completo e atividade diária dos últimos 14 dias, dias praticados na semana e os marcos cooperativos. Não há ranking nem penalidade por pausas. Evolução, álbum e marcos atualizam a cada minuto com a página visível e ao voltar à janela, preservando o formulário. Contagens são prática registrada, não estimativas de nível.

O álbum compartilhado permite escolher uma foto, visualizar, escrever legenda e publicar para ambos ou como incentivo ao parceiro. Compressão local para JPEG de até 1600 px e 600 KB descarta EXIF/localização. O servidor aceita JPEG/PNG/WebP de até 700 KB, valida assinatura e aplica atomicamente 80 fotos/25 MB para o casal. As imagens ficam em D1 e só são entregues pela API com o acesso compartilhado; não são assets públicos. Não há exclusão ou edição de fotos nesta versão. Legenda/destinatário ficam na sessão do navegador; pixels e prévia ficam só na aba aberta até o envio. A exportação inclui metadados e links, não os binários; abra a foto para salvá-la. Falha com confirmação incerta preserva o envio, bloqueia alterações e consulta o id no álbum antes de repetir, sem criar duplicata. Consulte `docs/EXPERIENCE-API.md` e `docs/EXPERIENCE-UI.md`.

A luz dos blocos é estática e discreta. As entradas usam apenas opacidade e 4 px em 180 ms, respeitando movimento reduzido. Não há parallax, confete, pulsação ou carrossel automático.

Recuperação após recarga: UUID/estado pendente também ficam na sessão. O álbum confere o envio; se não estiver confirmado, pede escolher novamente a mesma foto e mantém o UUID. Não armazena pixels no sessionStorage.

## Aprendizagem 0.5.0

Caderno de erros por perfil, três revisões curtas com agenda 1/3/7/14 dias, resposta de revisão preservada e calendário semanal com plano diário opcional. Acesso, início e resposta enviada são separados; sem meta não há “concluído”. Rota pelas cidades reutiliza os marcos existentes. Observações qualitativas futuras exigem trechos comparáveis reais da resposta anterior e atual.

Escuta oferece biblioteca com áudios prontos primeiro e geração personalizada. Reposição agendada limitada pelo teto compartilhado; a biblioteca pode esgotar. Revisores executam em paralelo com os mesmos gates C1. Voz com cache privado e trava por tarefa; fontes maiores que 4096 caracteres divididas em trechos. Migrações 0007–0009 necessárias antes do deploy. Calendário começa a registrar acessos/inícios a partir desta versão; respostas antigas são aproveitadas sem inventar acessos anteriores.

Interface web mais ampla, revisões compactas, informações da cidade recolhidas e câmera/galeria separadas. Capture de câmera precisa ser conferido em aparelho iOS e Android. Detalhes, comparação de estratégias e limitações em [docs/MELHORIAS-2026-10-07.md](docs/MELHORIAS-2026-10-07.md).
