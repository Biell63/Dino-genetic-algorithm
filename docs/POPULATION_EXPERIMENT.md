# Experimento: tamanho da população

**Pergunta:** quantos dinos por geração vale a pena usar?

**Método** (`npm run simulate`): para cada tamanho, 10 evoluções independentes (sementes 1 a 10). Cada uma roda até
que algum dino alcance **2000 pontos** ou até 60 gerações. Mede-se a taxa de sucesso e o número de gerações necessárias.
Elitismo proporcional (3% da população). O jogo é o completo: ciclo de 500 pontos de dia e 500 de noite, cactos de dia,
zumbis e esqueletos de noite, pássaros e meteoros.

| População | Aprendeu | Gerações (mediana) | Pior caso |
|---:|:---:|---:|---:|
| 100 | 9/10 | 31 | 55 |
| **150** | 9/10 | 41 | 56 |
| 200 | 10/10 | 39 | 48 |
| 300 | 10/10 | 38 | 48 |

**Conclusão:** com 10 sementes por tamanho, as diferenças entre 100 e 300 dinos ficam dentro do ruído; o que se vê é que
populações maiores (200 ou mais) falharam menos (10/10) e tiveram o pior caso melhor. O padrão do projeto continua
**150**, um meio-termo entre confiabilidade e custo de processamento. Se quiser máxima confiabilidade, use 200.

## Efeito de cada novidade do jogo

Cada elemento tornou o aprendizado mais lento (150 dinos):

| Jogo | Aprendeu | Gerações (mediana) |
|---|:---:|---:|
| Só cactos e pássaros | 20/20 | 18 |
| + meteoros | 19/20 | 28 |
| + noite com inimigos (zumbis e esqueletos) | 9/10 | 41 |

A rede precisa aprender habilidades novas: pular no instante certo para estar no ar no impacto do meteoro e ajustar o
tempo do pulo à velocidade de aproximação de cada inimigo (entrada `Enemy Speed`).

## Tamanho da camada escondida

Com 150 dinos e 8 sementes: 6 neurônios aprenderam 7/8 (mediana 41), 8 neurônios 7/8 (41), 10 neurônios 8/8 (31) e 12
neurônios 6/8 (34). Sem tendência clara, então o padrão ficou em **6** (o mais simples).

**Reproduzir:**

```bash
npm run simulate                                              # 6 sementes, tamanhos padrão
node scripts/simulate-population.mjs 10 100 150 200 300       # a tabela acima
node scripts/simulate-population.mjs 20 150 --meteors=off     # sem meteoros
```

A simulação é determinística: os mesmos parâmetros e sementes dão sempre o mesmo resultado.

> Notas de projeto: numa primeira versão, o meteoro podia cair junto de um cacto e a IA não aprendia (0/20); e os
> inimigos noturnos, mais rápidos que a pista, podiam alcançar o obstáculo da frente. Ambos foram corrigidos com
> regras de justiça (veja `ARCHITECTURE.md`).
