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
  "neighborhoods": [
    { "name": "Castelo III", "altNames": ["Castelo Três", "Ivo Martins"], "lat": -20.6335760, "lng": -41.2041395 }
  ]
}
```

- `name`: nome oficial, o único exibido.
- `altNames` (opcional): outros nomes do bairro, só para busca (LDMF-278).
- `lat`/`lng`: ponto do bairro, ou `null` quando não há fonte real. Nunca
  estimar coordenada.

## es-castelo.json (Castelo/ES)

- **Nomes oficiais:** Lei Municipal de Castelo nº 4.641, de 15/09/2026.
  "Jardim Primavera" é nome alternativo do Pantanal (decisão de 03/10/2026),
  então a lista tem 31 entradas.
- **CEP e código IBGE:** confirmados pela equipe (29360-000 e 3201407).
- **Coordenadas e nomes alternativos:** © colaboradores do OpenStreetMap,
  disponíveis sob a Open Database License (ODbL),
  https://www.openstreetmap.org/copyright. Levantamento de 03/10/2026 por
  Overpass na área IBGE 3201407 e Nominatim (detalhes na LDMF-264). Cada
  coordenada é o ponto de bairro marcado no OSM.

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

Sem coordenada (`null`): Caparaó, Jardins, Maravilha, Pedra Luz, Santa Fé,
Vista do Rio e Vista Linda. Para eles o pino começa no centro da cidade.
