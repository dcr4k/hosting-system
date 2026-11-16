import {TenantThemeVariant} from '../types/models';

export interface BrazilStateItem {
  uf: string;
  name: string;
  cities: string[];
}

export const CUSTOM_CITY_VALUE = '__CUSTOM_CITY__';

export const BRAZIL_STATES: BrazilStateItem[] = [
  {
    uf: 'AC',
    name: 'Acre',
    cities: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Brasileia'],
  },
  {
    uf: 'AL',
    name: 'Alagoas',
    cities: ['Maceió', 'Maragogi', 'São Miguel dos Milagres', 'Japaratinga', 'Piranhas', 'Arapiraca', 'Marechal Deodoro'],
  },
  {
    uf: 'AP',
    name: 'Amapá',
    cities: ['Macapá', 'Santana', 'Oiapoque', 'Laranjal do Jari'],
  },
  {
    uf: 'AM',
    name: 'Amazonas',
    cities: ['Manaus', 'Presidente Figueiredo', 'Parintins', 'Novo Airão', 'Tefé', 'Itacoatiara'],
  },
  {
    uf: 'BA',
    name: 'Bahia',
    cities: [
      'Salvador',
      'Porto Seguro',
      'Trancoso',
      "Arraial d'Ajuda",
      'Caraíva',
      'Morro de São Paulo',
      'Itacaré',
      'Ilhéus',
      'Praia do Forte',
      'Lençóis',
      'Feira de Santana',
      'Vitória da Conquista',
      'Barreiras',
    ],
  },
  {
    uf: 'CE',
    name: 'Ceará',
    cities: ['Fortaleza', 'Jericoacoara', 'Canoa Quebrada', 'Aquiraz', 'Cumbuco', 'Guaramiranga', 'Juazeiro do Norte', 'Sobral'],
  },
  {
    uf: 'DF',
    name: 'Distrito Federal',
    cities: ['Brasília', 'Taguatinga', 'Águas Claras', 'Planaltina', 'Gama'],
  },
  {
    uf: 'ES',
    name: 'Espírito Santo',
    cities: ['Vitória', 'Vila Velha', 'Guarapari', 'Domingos Martins', 'Pedra Azul', 'Itaúnas', 'Linhares', 'Cachoeiro de Itapemirim'],
  },
  {
    uf: 'GO',
    name: 'Goiás',
    cities: ['Goiânia', 'Caldas Novas', 'Pirenópolis', 'Alto Paraíso de Goiás', 'Rio Quente', 'Cidade de Goiás', 'Anápolis', 'Rio Verde'],
  },
  {
    uf: 'MA',
    name: 'Maranhão',
    cities: ['São Luís', 'Barreirinhas', 'Santo Amaro do Maranhão', 'Atins', 'Carolina', 'Imperatriz'],
  },
  {
    uf: 'MT',
    name: 'Mato Grosso',
    cities: ['Cuiabá', 'Chapada dos Guimarães', 'Nobres', 'Poconé', 'Sinop', 'Rondonópolis', 'Sorriso'],
  },
  {
    uf: 'MS',
    name: 'Mato Grosso do Sul',
    cities: ['Campo Grande', 'Bonito', 'Corumbá', 'Miranda', 'Dourados', 'Três Lagoas'],
  },
  {
    uf: 'MG',
    name: 'Minas Gerais',
    cities: [
      'Belo Horizonte',
      'Ouro Preto',
      'Tiradentes',
      'Monte Verde',
      'Capitólio',
      'São João del-Rei',
      'Diamantina',
      'Poços de Caldas',
      'Uberlândia',
      'Juiz de Fora',
      'São Thomé das Letras',
      'Brumadinho',
    ],
  },
  {
    uf: 'PA',
    name: 'Pará',
    cities: ['Belém', 'Alter do Chão', 'Santarém', 'Salinópolis', 'Marabá', 'Ilha do Marajó'],
  },
  {
    uf: 'PB',
    name: 'Paraíba',
    cities: ['João Pessoa', 'Conde', 'Cabedelo', 'Campina Grande', 'Bananeiras', 'Patos'],
  },
  {
    uf: 'PR',
    name: 'Paraná',
    cities: ['Curitiba', 'Foz do Iguaçu', 'Ilha do Mel', 'Morretes', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel'],
  },
  {
    uf: 'PE',
    name: 'Pernambuco',
    cities: ['Recife', 'Porto de Galinhas', 'Fernando de Noronha', 'Olinda', 'Tamandaré', 'Caruaru', 'Petrolina', 'Gravatá'],
  },
  {
    uf: 'PI',
    name: 'Piauí',
    cities: ['Teresina', 'Luís Correia', 'Parnaíba', 'Barra Grande', 'São Raimundo Nonato'],
  },
  {
    uf: 'RJ',
    name: 'Rio de Janeiro',
    cities: [
      'Rio de Janeiro',
      'Paraty',
      'Búzios',
      'Arraial do Cabo',
      'Cabo Frio',
      'Petrópolis',
      'Teresópolis',
      'Angra dos Reis',
      'Ilha Grande',
      'Visconde de Mauá',
      'Nova Friburgo',
      'Niterói',
      'Macaé',
    ],
  },
  {
    uf: 'RN',
    name: 'Rio Grande do Norte',
    cities: ['Natal', 'Pipa', 'São Miguel do Gostoso', 'Tibau do Sul', 'Galinhos', 'Mossoró', 'Parnamirim'],
  },
  {
    uf: 'RS',
    name: 'Rio Grande do Sul',
    cities: ['Porto Alegre', 'Gramado', 'Canela', 'Bento Gonçalves', 'Cambará do Sul', 'Torres', 'Caxias do Sul', 'Pelotas'],
  },
  {
    uf: 'RO',
    name: 'Rondônia',
    cities: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal'],
  },
  {
    uf: 'RR',
    name: 'Roraima',
    cities: ['Boa Vista', 'Rorainópolis', 'Pacaraima'],
  },
  {
    uf: 'SC',
    name: 'Santa Catarina',
    cities: [
      'Florianópolis',
      'Balneário Camboriú',
      'Bombinhas',
      'Garopaba',
      'Praia do Rosa',
      'Urubici',
      'Blumenau',
      'Joinville',
      'Itapema',
      'Penha',
    ],
  },
  {
    uf: 'SP',
    name: 'São Paulo',
    cities: [
      'São Paulo',
      'Campos do Jordão',
      'Ilhabela',
      'Ubatuba',
      'São Sebastião',
      'Maresias',
      'Guarujá',
      'Santos',
      'Brotas',
      'Olímpia',
      'Águas de Lindóia',
      'Campinas',
      'Ribeirão Preto',
      'São José dos Campos',
      'Sorocaba',
      'Atibaia',
    ],
  },
  {
    uf: 'SE',
    name: 'Sergipe',
    cities: ['Aracaju', 'Canindé de São Francisco', 'Estância', 'Itabaiana', 'Lagarto'],
  },
  {
    uf: 'TO',
    name: 'Tocantins',
    cities: ['Palmas', 'Mateiros (Jalapão)', 'Ponte Alta do Tocantins', 'Araguaína', 'Gurupi'],
  },
];

export function getCitiesForState(uf: string): string[] {
  const found = BRAZIL_STATES.find(
    (s) => s.uf.toUpperCase() === uf.trim().toUpperCase()
  );
  return found ? found.cities : [];
}

export interface TrendingPaletteColor {
  hex: string;
  name: string;
  rgb: string;
}

/**
 * Paleta completa da tabela COLOR PALETTE (9 linhas × 8 colunas = 72 cores)
 * com Color Name, HEX/WEB Code e RGB Code exatos da imagem enviada.
 */
export const PALETTE_COLORS_20: TrendingPaletteColor[] = [
  // Row 1 — Blues
  {name: 'Peaceful Blue', hex: '#B8DDF7', rgb: '184 221 247'},
  {name: 'Angel Blue', hex: '#A1BFE9', rgb: '161 191 233'},
  {name: 'Bright Blue', hex: '#50C8F6', rgb: '80 200 246'},
  {name: 'Turquoise Blue', hex: '#22B1C2', rgb: '34 177 194'},
  {name: 'Happy Blue', hex: '#2291BF', rgb: '34 145 191'},
  {name: 'Royal Blue', hex: '#005DA6', rgb: '0 93 166'},
  {name: 'Blueberry', hex: '#2D2B76', rgb: '45 43 118'},
  {name: 'Navy Blue', hex: '#190E5D', rgb: '25 14 93'},

  // Row 2 — Teals & Aquas
  {name: 'Ice Blue', hex: '#C2E6E6', rgb: '194 230 230'},
  {name: 'Robins Blue', hex: '#92D6D3', rgb: '146 214 211'},
  {name: 'Happy Sky', hex: '#7ACDD8', rgb: '122 205 216'},
  {name: 'Aqua Blue', hex: '#54C1C4', rgb: '84 193 196'},
  {name: 'Aqua Mint', hex: '#4EBAAD', rgb: '78 186 173'},
  {name: 'Teal', hex: '#19A2A6', rgb: '25 162 166'},
  {name: 'Medium Teal', hex: '#2D8E95', rgb: '45 142 149'},
  {name: 'Dark Teal', hex: '#21747C', rgb: '33 116 124'},

  // Row 3 — Greens
  {name: 'Pastel Green', hex: '#CBE8BE', rgb: '203 232 190'},
  {name: 'Celery Green', hex: '#AED89A', rgb: '174 216 154'},
  {name: 'Pistachio', hex: '#9AD59B', rgb: '154 213 155'},
  {name: 'Seafoam', hex: '#ABC5BD', rgb: '171 197 189'},
  {name: 'Fresh Green', hex: '#AFCD36', rgb: '175 205 54'},
  {name: 'Green Grass', hex: '#8EC63F', rgb: '142 198 63'},
  {name: 'Emerald', hex: '#66A462', rgb: '102 164 98'},
  {name: 'Forest Green', hex: '#487B4D', rgb: '72 123 77'},

  // Row 4 — Lilacs & Purples
  {name: 'Pastel Lilac', hex: '#D1CFE7', rgb: '209 207 231'},
  {name: 'Lilac', hex: '#BFBBD9', rgb: '191 187 217'},
  {name: 'Lavender', hex: '#C1A2CB', rgb: '193 162 203'},
  {name: 'Plum', hex: '#746BA3', rgb: '116 107 163'},
  {name: 'Violet', hex: '#5D2B76', rgb: '93 43 118'},
  {name: 'Orchid Purple', hex: '#942B70', rgb: '148 43 112'},
  {name: 'Blue Violet', hex: '#482C76', rgb: '72 44 118'},
  {name: 'Eggplant', hex: '#602D59', rgb: '96 45 89'},

  // Row 5 — Pinks & Magentas
  {name: 'Pastel Pink', hex: '#F8D7E7', rgb: '248 215 231'},
  {name: 'Cotton Candy', hex: '#F9C2DA', rgb: '249 194 218'},
  {name: 'Dusty Rose', hex: '#E59EAC', rgb: '229 158 172'},
  {name: 'Sweet Pink', hex: '#F49AB6', rgb: '244 154 182'},
  {name: 'Rose', hex: '#F1749B', rgb: '241 116 155'},
  {name: 'Hot Pink', hex: '#EE4799', rgb: '238 71 153'},
  {name: 'Mamey Pink', hex: '#F05878', rgb: '240 88 120'},
  {name: 'Fuschia', hex: '#DE166B', rgb: '222 22 107'},

  // Row 6 — Peaches, Corals & Reds
  {name: 'Pale Peach', hex: '#FBDEDA', rgb: '251 222 218'},
  {name: 'Peach', hex: '#F8BCA4', rgb: '248 188 164'},
  {name: 'Light Coral', hex: '#F48478', rgb: '244 132 120'},
  {name: 'Honey Suckle', hex: '#F07176', rgb: '240 113 118'},
  {name: 'Coral', hex: '#F17056', rgb: '241 112 86'},
  {name: 'Pretty Red', hex: '#CA292E', rgb: '202 41 46'},
  {name: 'Wine Red', hex: '#A21E24', rgb: '162 30 36'},
  {name: 'Burgundy', hex: '#912B2B', rgb: '145 43 43'},

  // Row 7 — Oranges, Rusts & Browns
  {name: 'Happy Orange', hex: '#F79928', rgb: '247 153 40'},
  {name: 'Tangerine', hex: '#F47725', rgb: '244 119 37'},
  {name: 'Tango', hex: '#F15524', rgb: '241 85 36'},
  {name: 'Burnt Orange', hex: '#DC8728', rgb: '220 135 40'},
  {name: 'Pumpkin', hex: '#D65C29', rgb: '214 92 41'},
  {name: 'Rust', hex: '#BE4827', rgb: '190 72 39'},
  {name: 'Leather', hex: '#985F5B', rgb: '152 95 91'},
  {name: 'Chocolate', hex: '#644545', rgb: '100 69 69'},

  // Row 8 — Yellows, Golds & Sands
  {name: 'Buttercup', hex: '#FFF6A8', rgb: '255 246 168'},
  {name: 'Vanilla', hex: '#FAF895', rgb: '250 248 149'},
  {name: 'Honey', hex: '#FAE478', rgb: '250 228 120'},
  {name: 'Bright Yellow', hex: '#FEF200', rgb: '254 242 0'},
  {name: 'Sunny Yellow', hex: '#F6E63F', rgb: '246 230 63'},
  {name: 'Mustard Yellow', hex: '#E7C034', rgb: '231 192 52'},
  {name: 'Camel', hex: '#D7BF5E', rgb: '215 191 94'},
  {name: 'Sand', hex: '#DFCFA4', rgb: '223 207 164'},

  // Row 9 — Taupes, Greys & Blacks
  {name: 'Tan', hex: '#DFD1B4', rgb: '223 209 180'},
  {name: 'Soft Taupe', hex: '#B3A89D', rgb: '179 168 157'},
  {name: 'Taupe', hex: '#7B6E6A', rgb: '123 110 106'},
  {name: 'Dark Brown', hex: '#473232', rgb: '71 50 50'},
  {name: 'Soft Gray', hex: '#D1D3D4', rgb: '209 211 212'},
  {name: 'Slate Gray', hex: '#88898D', rgb: '136 137 141'},
  {name: 'Charcoal', hex: '#58585A', rgb: '88 88 90'},
  {name: 'Black', hex: '#231F20', rgb: '35 31 32'},
];


export interface TenantThemeSpec {
  id: TenantThemeVariant;
  name: string;
  subtitle: string;
  description: string;
}

export const TENANT_THEMES: TenantThemeSpec[] = [
  {
    id: 'classic_light',
    name: 'Editorial Claro',
    subtitle: 'Branco limpo com acentos da marca',
    description:
      'Visual leve e arejado com fundo branco, barra de busca com borda na cor escolhida, etiquetas de destaque e botões principais coloridos.',
  },
  {
    id: 'resort_tint',
    name: 'Atmosfera Imersiva',
    subtitle: 'Cabeçalho e Hero na cor da marca',
    description:
      'Transforma a barra superior e o banner principal com gradiente da cor institucional, além de cartões com faixa superior e superfícies suaves.',
  },
  {
    id: 'boutique_dark',
    name: 'Noturno Sofisticado',
    subtitle: 'Dark mode elegante com brilho colorido',
    description:
      'Estética noturna de alto contraste em grafite profundo, cartões escuros refinados e destaques luminosos na paleta selecionada.',
  },
];

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return `rgba(15, 23, 42, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(15, 23, 42, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function darkenHex(hex: string, factor = 0.25): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return '#090F1D';
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * (1 - factor)));
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * (1 - factor)));
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * (1 - factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function isColorLight(hex: string): boolean {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 165;
}
