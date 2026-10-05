# Lista local de bairros

Lista temporária usada pelo front enquanto a rota de bairros do backend
(LDMF-264) não existe. Cada arquivo tem uma cidade, no mesmo formato que a
rota vai devolver:

```json
{
  "state": "ES",
  "city": "Castelo",
  "ibgeCode": "3201407",
  "cep": "29360-000",
  "center": { "lat": -20.6153082, "lng": -41.2063262 },
  "neighborhoods": [
    { "name": "Castelo III", "altNames": ["Castelo 3", "Castelo Três", "Pombal", "Ivo Martins"], "lat": -20.6335760, "lng": -41.2041395 }
  ]
}
```

- `name`: nome oficial, o único exibido.
- `altNames` (opcional): outros nomes do bairro (LDMF-278). Servem para busca;
  os que são nomes diferentes (não só outra grafia) aparecem entre parênteses
  na opção da lista. O valor salvo é sempre o `name`.
- `lat`/`lng`: ponto do bairro, ou `null` quando não há fonte real. Nunca
  estimar coordenada: todo valor tem a fonte registrada abaixo.
- `center`: centro da área urbana (LDMF-264). É onde o pino começa quando o
  bairro não tem coordenada ou o cliente escolhe "Outro", sem chamar o
  Nominatim (a busca da cidade no Nominatim devolvia um ponto na zona rural).
  Calculado como a média simples das `lat` e das `lng` dos bairros que têm
  coordenada, arredondada para 7 casas decimais. Recalcular sempre que uma
  coordenada da lista mudar.

## es-castelo.json (Castelo/ES)

- **Nomes oficiais:** Lei Municipal de Castelo nº 4.641, de 15/09/2026. A
  lista tem os 32 bairros da lei. Pantanal e Jardim Primavera são bairros
  separados e vizinhos (a junção feita a partir do OSM foi revertida em
  03/10/2026; ver LDMF-278).
- **CEP e código IBGE:** confirmados pela equipe (29360-000 e 3201407).
- **Nomes alternativos de Castelo III:** "Castelo 3" e "Pombal" são como os
  moradores chamam o bairro (informado pela equipe); "Castelo Três" e
  "Ivo Martins" vêm do OpenStreetMap. "Cava Roxa" (Cava-Roxa) também vem do
  OpenStreetMap.

### Fonte das coordenadas

Os 32 bairros têm coordenada, de duas fontes.

**24 do OpenStreetMap.** © colaboradores do OpenStreetMap, disponíveis sob a
Open Database License (ODbL), https://www.openstreetmap.org/copyright.
Levantamento de 03/10/2026 por Overpass na área IBGE 3201407 e Nominatim
(detalhes na LDMF-264). Cada coordenada é o ponto de bairro marcado no OSM.
A do Pantanal (node/3744557670, que no OSM tem o nome "Jardim Primavera" e o
alternativo "Pantanal") fica com o Pantanal, confirmado pela equipe.

| Bairro | Origem no OSM |
| --- | --- |
| Aracuí | node/3573535147 |
| Baixa Itália | node/3573535179 |
| Bela Vista | node/3573535199 |
| Castelo III | node/3573535278 |
| Cava-Roxa | node/3573535280 |
| Centro | node/3573535339 |
| Esplanada | node/3573535424 |
| Exposição | node/10929230933 |
| Garagem | node/3573535453 |
| Independência | node/3573535477 |
| Niterói | node/3573535639 |
| Nossa Senhora Aparecida | node/3573535647 |
| Pantanal | node/3744557670 |
| Pouso Alto | node/3573535777 |
| Prainha | node/3744582742 |
| Santa Bárbara | node/3573535935 |
| Santa Mônica | node/3745887465 |
| Santo Agostinho | node/3573535976 |
| Santo Andrezinho | node/3573535979 |
| São Miguel | node/3573536156 |
| Vila Barbosa | node/3573536217 |
| Vila Izabel | node/3573536231 |
| Vila Nova | node/3573536251 |
| Volta Redonda | node/3573536291 |

**8 do mapa oficial da Lei 4.641, leitura aproximada, erro de 100 a 220 m.**
Mapa de bairros anexo à lei:
https://castelo.es.gov.br/wp-content/uploads/2026/09/Mapa-dos-Bairros.pdf
(grade UTM SIRGAS 2000, fuso 24S). A posição de cada bairro foi lida na grade
e convertida para lat/lng; o erro foi medido aplicando o mesmo método a 4
bairros com coordenada do OSM. Servem como ponto de partida do pino, não como
ponto exato. Uso aprovado pela equipe em 03/10/2026 (comentário na LDMF-264).

| Bairro | Origem |
| --- | --- |
| Caparaó | Mapa oficial, leitura aproximada |
| Jardim Primavera | Mapa oficial, leitura aproximada |
| Jardins | Mapa oficial, leitura aproximada |
| Maravilha | Mapa oficial, leitura aproximada |
| Pedra Luz | Mapa oficial, leitura aproximada |
| Santa Fé | Mapa oficial, leitura aproximada |
| Vista do Rio | Mapa oficial, leitura aproximada |
| Vista Linda | Mapa oficial, leitura aproximada |

### `center`

Média dos 32 bairros, calculada por script em aritmética decimal exata a
partir dos valores do JSON (04/10/2026):

- soma das latitudes: -659,6898639 → ÷ 32 = -20,615308246875 → **-20.6153082**
- soma das longitudes: -1318,6024389 → ÷ 32 = -41,206326215625 → **-41.2063262**

O ponto é derivado das duas fontes acima (inclui dados do OpenStreetMap, mesma
atribuição ODbL).
