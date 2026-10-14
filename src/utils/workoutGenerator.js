import { getIMCRecommendations } from './imc';

export const EXERCISE_DB = {
  chest: [
    { id: 'chest_press_machine', name: 'Supino na Máquina (Peitoral Dorsal)', muscleGroup: ['Peitoral', 'Tríceps'], difficulty: 'Iniciante', equipment: 'chest_back_machine', sets: 3, reps: '10–12', rest: 75, category: 'Peito',
      instructions: ['Ajuste o banco/assento para os punhos ficarem na altura do peito', 'Segure as alças com pegada firme', 'Empurre para frente até quase estender os cotovelos', 'Volte controlado até a posição inicial'],
      tips: 'Não bata os pesos no fim do curso — controle a volta em todas as repetições.' },
    { id: 'smith_bench_press', name: 'Supino no Smith', muscleGroup: ['Peitoral', 'Tríceps'], difficulty: 'Intermediário', equipment: 'smith', sets: 4, reps: '8–12', rest: 90, category: 'Peito',
      instructions: ['Deite no banco alinhado com a barra do Smith', 'Destranque a barra girando-a nos encaixes', 'Desça a barra até tocar levemente o peito', 'Empurre para cima sem travar totalmente os cotovelos'],
      tips: 'Sempre trave a barra nos encaixes de segurança antes de se levantar do banco.' },
    { id: 'cable_crossover', name: 'Crucifixo no Cabo', muscleGroup: ['Peitoral'], difficulty: 'Intermediário', equipment: 'cable', sets: 3, reps: '12–15', rest: 60, category: 'Peito',
      instructions: ['Segure as alças altas do cabo, um pé na frente do outro', 'Incline o tronco levemente à frente', 'Traga as mãos para a frente do corpo em arco', 'Volte controlado sentindo o alongamento no peito'],
      tips: 'Mantenha os cotovelos levemente flexionados durante todo o movimento.' },
    { id: 'db_press', name: 'Supino com Halteres', muscleGroup: ['Peitoral', 'Tríceps'], difficulty: 'Intermediário', equipment: 'dumbbells', sets: 4, reps: '8–12', rest: 90, category: 'Peito',
      instructions: ['Deite no banco com um haltere em cada mão', 'Empurre os halteres para cima até quase se tocarem', 'Desça controlado até o peito'],
      tips: 'Não trave os cotovelos no topo do movimento.' },
    { id: 'db_fly', name: 'Crucifixo com Halteres', muscleGroup: ['Peitoral', 'Deltóide'], difficulty: 'Intermediário', equipment: 'dumbbells', sets: 3, reps: '10–12', rest: 60, category: 'Peito',
      instructions: ['Deite com halteres acima do peito, cotovelos levemente flexionados', 'Abra os braços em arco até sentir alongamento no peito', 'Volte controlando o movimento'],
      tips: 'Mantenha uma leve flexão nos cotovelos o tempo todo.' },
    { id: 'pushup', name: 'Flexão de Braço', muscleGroup: ['Peitoral', 'Tríceps', 'Deltóide anterior'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '10–15', rest: 60, category: 'Peito',
      instructions: ['Apoie as mãos no chão, levemente mais largas que os ombros', 'Mantenha o corpo alinhado da cabeça aos pés', 'Desça flexionando os cotovelos', 'Empurre de volta até estender os braços'],
      tips: 'Não deixe o quadril cair — core contraído durante todo o movimento.' },
    { id: 'incline_pushup', name: 'Flexão Inclinada', muscleGroup: ['Peitoral superior', 'Ombros'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '10–12', rest: 60, category: 'Peito',
      instructions: ['Apoie as mãos em um banco ou superfície elevada', 'Corpo alinhado, pés no chão', 'Desça o peito em direção à superfície', 'Empurre de volta à posição inicial'],
      tips: 'Quanto mais alta a superfície, mais leve fica o exercício — ideal para começar.' },
  ],
  back: [
    { id: 'lat_pulldown_ex', name: 'Puxada Alta', muscleGroup: ['Grande dorsal', 'Bíceps'], difficulty: 'Intermediário', equipment: 'lat_pulldown', sets: 4, reps: '10–12', rest: 75, category: 'Costas',
      instructions: ['Sente-se e ajuste os apoios das coxas', 'Segure a barra com pegada mais larga que os ombros', 'Puxe a barra até a altura do peito', 'Volte controlado até os braços quase estenderem'],
      tips: 'Puxe com as costas, não só com os braços — imagine levar os cotovelos ao bolso.' },
    { id: 'rear_delt_machine', name: 'Voador Invertido na Máquina', muscleGroup: ['Rombóide', 'Trapézio médio'], difficulty: 'Iniciante', equipment: 'chest_back_machine', sets: 3, reps: '12–15', rest: 45, category: 'Costas',
      instructions: ['Sente de frente para o encosto da máquina', 'Segure as alças com os braços à frente', 'Abra os braços para trás contraindo as escápulas', 'Volte controlado'],
      tips: 'Aperte as escápulas no ponto final de cada repetição.' },
    { id: 'seated_cable_row', name: 'Remada no Pulley', muscleGroup: ['Grande dorsal', 'Rombóide'], difficulty: 'Iniciante', equipment: 'cable', sets: 3, reps: '10–12', rest: 60, category: 'Costas',
      instructions: ['Sente com os pés apoiados na plataforma', 'Segure a alça com os braços estendidos', 'Puxe até a alça tocar o abdômen, cotovelos junto ao corpo', 'Volte controlado sem arredondar as costas'],
      tips: 'Mantenha a coluna neutra — não use o tronco para "ajudar" a puxar.' },
    { id: 'row_db', name: 'Remada Unilateral', muscleGroup: ['Grande dorsal', 'Rombóide', 'Bíceps'], difficulty: 'Iniciante', equipment: 'dumbbells', sets: 3, reps: '10–12 cada', rest: 60, category: 'Costas',
      instructions: ['Apoie um joelho e mão no banco', 'Puxe o haltere em direção ao quadril', 'Desça controlado'],
      tips: 'Puxe com o cotovelo, não com o braço.' },
    { id: 'pullover', name: 'Pullover com Haltere', muscleGroup: ['Grande dorsal', 'Serrátil'], difficulty: 'Intermediário', equipment: 'dumbbells', sets: 3, reps: '12', rest: 60, category: 'Costas',
      instructions: ['Deite perpendicular ao banco, apenas os ombros apoiados', 'Leve o haltere para trás da cabeça', 'Traga de volta contraindo as costas'],
      tips: 'Mantenha os braços levemente flexionados.' },
    { id: 'reverse_fly', name: 'Voador Invertido', muscleGroup: ['Rombóide', 'Trapézio médio'], difficulty: 'Iniciante', equipment: 'dumbbells', sets: 3, reps: '12–15', rest: 45, category: 'Costas',
      instructions: ['Incline o tronco à frente, halteres pendendo', 'Abra os braços elevando até a linha do ombro', 'Desça controlado'],
      tips: 'Aperte as escápulas no topo do movimento.' },
    { id: 'superman', name: 'Superman', muscleGroup: ['Lombar', 'Glúteos'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '15', rest: 45, category: 'Costas',
      instructions: ['Deite de bruços, braços estendidos à frente', 'Eleve simultaneamente braços, peito e pernas', 'Segure um instante no topo', 'Desça controlado'],
      tips: 'Movimento pequeno e controlado — não force a extensão da lombar.' },
  ],
  legs: [
    { id: 'leg_press_ex', name: 'Leg Press', muscleGroup: ['Quadríceps', 'Glúteos'], difficulty: 'Intermediário', equipment: 'leg_press', sets: 4, reps: '10–12', rest: 90, category: 'Pernas',
      instructions: ['Sente-se e posicione os pés na plataforma, largura dos ombros', 'Destranque o carro de segurança', 'Desça flexionando os joelhos até 90°', 'Empurre de volta sem travar totalmente os joelhos'],
      tips: 'Nunca deixe os joelhos "colapsarem" para dentro — mantenha alinhados com os pés.' },
    { id: 'smith_squat', name: 'Agachamento no Smith', muscleGroup: ['Quadríceps', 'Glúteos'], difficulty: 'Intermediário', equipment: 'smith', sets: 4, reps: '10–12', rest: 90, category: 'Pernas',
      instructions: ['Posicione a barra apoiada na parte superior das costas (trapézio)', 'Destranque a barra e dê um passo para posicionar os pés', 'Desça flexionando os joelhos, quadril para trás', 'Suba empurrando pelos calcanhares'],
      tips: 'Trave a barra nos encaixes de segurança sempre que terminar a série.' },
    { id: 'leg_extension', name: 'Cadeira Extensora', muscleGroup: ['Quadríceps'], difficulty: 'Iniciante', equipment: 'leg_machine', sets: 3, reps: '12–15', rest: 60, category: 'Pernas',
      instructions: ['Sente-se com os joelhos alinhados ao eixo da máquina', 'Encaixe os tornozelos sob o apoio', 'Estenda as pernas até quase a extensão total', 'Desça controlado'],
      tips: 'Evite estender totalmente com força — controle a fase de descida.' },
    { id: 'leg_curl', name: 'Cadeira Flexora', muscleGroup: ['Isquiotibiais'], difficulty: 'Iniciante', equipment: 'leg_machine', sets: 3, reps: '12–15', rest: 60, category: 'Pernas',
      instructions: ['Posicione-se conforme o modelo da máquina (sentado ou deitado)', 'Encaixe os tornozelos sob o apoio', 'Flexione os joelhos trazendo o apoio em direção aos glúteos', 'Volte controlado'],
      tips: 'Não jogue o quadril para cima para compensar — mantenha-o fixo no banco.' },
    { id: 'adductor_machine', name: 'Cadeira Adutora', muscleGroup: ['Adutores'], difficulty: 'Iniciante', equipment: 'leg_machine', sets: 3, reps: '15', rest: 45, category: 'Pernas',
      instructions: ['Sente-se com as pernas apoiadas nas almofadas laterais', 'Ajuste a amplitude no equipamento', 'Feche as pernas contra a resistência', 'Volte controlado até a abertura inicial'],
      tips: 'Ajuste a amplitude gradualmente — não force o alongamento máximo de início.' },
    { id: 'abductor_machine', name: 'Cadeira Abdutora', muscleGroup: ['Glúteo médio'], difficulty: 'Iniciante', equipment: 'leg_machine', sets: 3, reps: '15', rest: 45, category: 'Pernas',
      instructions: ['Sente-se com as pernas apoiadas nas almofadas', 'Empurre as pernas para fora contra a resistência', 'Volte controlado até a posição inicial'],
      tips: 'Mantenha as costas apoiadas no encosto durante todo o movimento.' },
    { id: 'goblet_squat', name: 'Agachamento Goblet', muscleGroup: ['Quadríceps', 'Glúteos', 'Core'], difficulty: 'Iniciante', equipment: 'dumbbells', sets: 3, reps: '12', rest: 75, category: 'Pernas',
      instructions: ['Segure um haltere junto ao peito', 'Agache mantendo o tronco ereto', 'Suba controlado'],
      tips: 'Cotovelos passam por dentro dos joelhos na descida.' },
    { id: 'rdl', name: 'Levantamento Terra Romeno', muscleGroup: ['Isquiotibiais', 'Glúteos', 'Lombar'], difficulty: 'Intermediário', equipment: 'dumbbells', sets: 3, reps: '10–12', rest: 90, category: 'Pernas',
      instructions: ['Halteres à frente das coxas, leve flexão nos joelhos', 'Desça o tronco levando o quadril para trás', 'Suba contraindo glúteos e isquiotibiais'],
      tips: 'Costas retas o tempo todo, sem arredondar.' },
    { id: 'squat', name: 'Agachamento Livre', muscleGroup: ['Quadríceps', 'Glúteos', 'Isquiotibiais'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 4, reps: '12–15', rest: 90, category: 'Pernas',
      instructions: ['Fique em pé com os pés na largura dos ombros', 'Aponte os pés levemente para fora', 'Desça como se fosse sentar em uma cadeira', 'Suba empurrando os calcanhares contra o chão'],
      tips: 'Joelhos alinhados com os pés, não deixe cair para dentro.' },
    { id: 'lunge', name: 'Avanço', muscleGroup: ['Quadríceps', 'Glúteos'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '10 cada', rest: 60, category: 'Pernas',
      instructions: ['Dê um passo à frente', 'Flexione os dois joelhos até 90°', 'Volte à posição inicial'],
      tips: 'Joelho da frente não deve ultrapassar a ponta do pé.' },
    { id: 'calf_raise', name: 'Elevação de Panturrilha', muscleGroup: ['Panturrilha'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '20', rest: 30, category: 'Pernas',
      instructions: ['Em pé, eleve os calcanhares o máximo possível', 'Segure um instante no topo', 'Desça controlado'],
      tips: 'Amplitude completa, sem pressa.' },
    { id: 'wall_sit', name: 'Cadeira na Parede', muscleGroup: ['Quadríceps', 'Glúteos'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '30–45s', rest: 60, category: 'Pernas', isTime: true,
      instructions: ['Encoste as costas na parede', 'Deslize até os joelhos ficarem a 90°', 'Segure a posição pelo tempo indicado'],
      tips: 'Se sentir dor no joelho, suba um pouco a posição (ângulo maior que 90°).' },
  ],
  glutes: [
    { id: 'hip_thrust_machine', name: 'Elevação Pélvica na Máquina', muscleGroup: ['Glúteos', 'Isquiotibiais'], difficulty: 'Intermediário', equipment: 'hip_machine', sets: 4, reps: '12–15', rest: 60, category: 'Glúteos',
      instructions: ['Posicione-se conforme o encosto da máquina, joelhos flexionados', 'Apoie os pés na plataforma', 'Empurre o quadril para cima contraindo os glúteos', 'Desça controlado sem tocar totalmente o peso'],
      tips: 'Contraia bem os glúteos no topo — evite compensar com a lombar.' },
    { id: 'glute_machine_ex', name: 'Glúteo Máximo na Máquina', muscleGroup: ['Glúteos'], difficulty: 'Iniciante', equipment: 'glute_machine', sets: 3, reps: '15', rest: 45, category: 'Glúteos',
      instructions: ['Posicione-se conforme o modelo (de pé ou apoiado)', 'Encaixe a perna no apoio', 'Empurre para trás/baixo contraindo o glúteo', 'Volte controlado'],
      tips: 'Movimento controlado — não use embalo para completar a repetição.' },
    { id: 'cable_kickback', name: 'Coice no Cabo', muscleGroup: ['Glúteos'], difficulty: 'Iniciante', equipment: 'cable', sets: 3, reps: '15 cada', rest: 45, category: 'Glúteos',
      instructions: ['Prenda o velcro do cabo no tornozelo', 'Apoie as mãos no equipamento para equilíbrio', 'Empurre a perna para trás contraindo o glúteo', 'Volte controlado'],
      tips: 'Mantenha o tronco estável — o movimento vem só do quadril.' },
    { id: 'glute_bridge', name: 'Elevação de Quadril', muscleGroup: ['Glúteos', 'Isquiotibiais', 'Lombar'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '15–20', rest: 45, category: 'Glúteos',
      instructions: ['Deite de costas, joelhos flexionados, pés no chão', 'Eleve o quadril contraindo os glúteos', 'Segure um instante no topo', 'Desça controlado'],
      tips: 'Não deixe a lombar fazer o esforço — foco na contração do glúteo.' },
    { id: 'donkey_kick', name: 'Coice de Burro', muscleGroup: ['Glúteos'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '15 cada', rest: 30, category: 'Glúteos',
      instructions: ['Fique de quatro apoios, mãos e joelhos no chão', 'Eleve uma perna para trás mantendo o joelho flexionado', 'Contraia o glúteo no topo', 'Desça controlado'],
      tips: 'Mantenha o core contraído para não arquear a lombar.' },
    { id: 'fire_hydrant', name: 'Abdução Quadrupede', muscleGroup: ['Glúteo médio'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '15 cada', rest: 30, category: 'Glúteos',
      instructions: ['Fique de quatro apoios', 'Eleve uma perna para o lado mantendo o joelho flexionado', 'Volte controlado sem tocar o chão entre as repetições'],
      tips: 'Quadril estável — evite girar o tronco durante o movimento.' },
    { id: 'sumo_squat', name: 'Agachamento Sumo', muscleGroup: ['Glúteos', 'Adutores', 'Quadríceps'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '15', rest: 45, category: 'Glúteos',
      instructions: ['Pés bem afastados, pontas voltadas para fora', 'Desça mantendo o tronco ereto', 'Suba contraindo glúteos e adutores'],
      tips: 'Joelhos seguem a direção dos pés durante toda a descida.' },
  ],
  shoulders: [
    { id: 'shoulder_machine_press', name: 'Desenvolvimento na Máquina', muscleGroup: ['Deltóide', 'Tríceps'], difficulty: 'Iniciante', equipment: 'shoulder_machine', sets: 4, reps: '10–12', rest: 75, category: 'Ombros',
      instructions: ['Ajuste o assento para as alças ficarem na altura dos ombros', 'Segure as alças com pegada firme', 'Empurre para cima até quase estender os cotovelos', 'Desça controlado'],
      tips: 'Não desça além da linha dos ombros para proteger as articulações.' },
    { id: 'cable_lateral_raise', name: 'Elevação Lateral no Cabo', muscleGroup: ['Deltóide lateral'], difficulty: 'Intermediário', equipment: 'cable', sets: 3, reps: '12–15', rest: 45, category: 'Ombros',
      instructions: ['Fique de lado para a polia baixa', 'Segure a alça com o braço mais afastado do equipamento', 'Eleve o braço até a altura do ombro', 'Desça controlado'],
      tips: 'Movimento lento — o cabo tende a acelerar a descida se você relaxar.' },
    { id: 'shoulder_press', name: 'Desenvolvimento com Halteres', muscleGroup: ['Deltóide', 'Tríceps'], difficulty: 'Intermediário', equipment: 'dumbbells', sets: 4, reps: '10–12', rest: 90, category: 'Ombros',
      instructions: ['Sente com halteres na altura dos ombros', 'Empurre para cima até estender os braços', 'Desça controlado'],
      tips: 'Evite arquear demais a lombar.' },
    { id: 'lateral_raise', name: 'Elevação Lateral', muscleGroup: ['Deltóide lateral'], difficulty: 'Iniciante', equipment: 'dumbbells', sets: 3, reps: '12–15', rest: 45, category: 'Ombros',
      instructions: ['Em pé, halteres ao lado do corpo', 'Eleve os braços até a altura dos ombros', 'Desça controlado'],
      tips: 'Cotovelos levemente flexionados, sem usar embalo.' },
    { id: 'front_raise', name: 'Elevação Frontal', muscleGroup: ['Deltóide anterior'], difficulty: 'Iniciante', equipment: 'dumbbells', sets: 3, reps: '12', rest: 45, category: 'Ombros',
      instructions: ['Em pé, halteres à frente das coxas', 'Eleve um braço (ou os dois) até a altura do ombro', 'Desça controlado'],
      tips: 'Não balance o tronco para ajudar a subir o peso.' },
    { id: 'pike_pushup', name: 'Flexão Pike', muscleGroup: ['Deltóide', 'Tríceps'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '8–12', rest: 60, category: 'Ombros',
      instructions: ['Mãos e pés no chão, quadril elevado formando um "V" invertido', 'Flexione os cotovelos descendo a cabeça em direção ao chão', 'Empurre de volta à posição inicial'],
      tips: 'Quanto mais próximos os pés das mãos, mais intenso fica para os ombros.' },
  ],
  arms: [
    { id: 'cable_pushdown', name: 'Tríceps no Pulley (Corda)', muscleGroup: ['Tríceps'], difficulty: 'Iniciante', equipment: 'cable', sets: 3, reps: '12–15', rest: 45, category: 'Braços',
      instructions: ['Segure a corda com pegada neutra na polia alta', 'Cotovelos fixos junto ao corpo', 'Estenda os braços para baixo', 'Volte controlado'],
      tips: 'Só os antebraços se movem — cotovelos travados na lateral do corpo.' },
    { id: 'cable_curl', name: 'Rosca no Cabo', muscleGroup: ['Bíceps'], difficulty: 'Iniciante', equipment: 'cable', sets: 3, reps: '12', rest: 45, category: 'Braços',
      instructions: ['Segure a barra na polia baixa, braços estendidos', 'Flexione os cotovelos elevando a barra', 'Desça controlado'],
      tips: 'Evite balançar o tronco para "ajudar" a levantar o peso.' },
    { id: 'barbell_curl', name: 'Rosca Direta na Barra W', muscleGroup: ['Bíceps'], difficulty: 'Iniciante', equipment: 'barbell', sets: 3, reps: '10–12', rest: 45, category: 'Braços',
      instructions: ['Em pé, segure a barra W com pegada supinada', 'Cotovelos fixos ao lado do corpo', 'Flexione elevando a barra', 'Desça controlado'],
      tips: 'A barra W reduz a tensão no punho comparado à barra reta.' },
    { id: 'bicep_curl', name: 'Rosca Bíceps', muscleGroup: ['Bíceps'], difficulty: 'Iniciante', equipment: 'dumbbells', sets: 3, reps: '12', rest: 45, category: 'Braços',
      instructions: ['Em pé, halteres ao lado do corpo, palmas para frente', 'Flexione os cotovelos elevando os halteres', 'Desça controlado'],
      tips: 'Evite balançar o tronco para ajudar o movimento.' },
    { id: 'hammer_curl', name: 'Rosca Martelo', muscleGroup: ['Bíceps', 'Braquial'], difficulty: 'Iniciante', equipment: 'dumbbells', sets: 3, reps: '12', rest: 45, category: 'Braços',
      instructions: ['Halteres com pegada neutra (palmas de frente uma para outra)', 'Flexione os cotovelos', 'Desça controlado'],
      tips: 'Cotovelos fixos ao lado do corpo.' },
    { id: 'tricep_ext', name: 'Extensão Tríceps com Haltere', muscleGroup: ['Tríceps'], difficulty: 'Iniciante', equipment: 'dumbbells', sets: 3, reps: '12', rest: 45, category: 'Braços',
      instructions: ['Sente ou fique em pé, haltere com as duas mãos atrás da cabeça', 'Cotovelos apontando para o teto', 'Estenda os braços para cima', 'Desça controlado'],
      tips: 'Mantenha os cotovelos fixos — só o antebraço se move.' },
    { id: 'tricep_dip', name: 'Tríceps no Banco', muscleGroup: ['Tríceps'], difficulty: 'Iniciante', equipment: 'bench', sets: 3, reps: '10–15', rest: 45, category: 'Braços',
      instructions: ['Apoie as mãos no banco atrás do corpo', 'Desça flexionando os cotovelos', 'Empurre de volta para cima'],
      tips: 'Mantenha os cotovelos apontando para trás, não para os lados.' },
  ],
  core: [
    { id: 'cable_crunch', name: 'Abdominal no Cabo', muscleGroup: ['Reto abdominal'], difficulty: 'Intermediário', equipment: 'cable', sets: 3, reps: '15', rest: 45, category: 'Core',
      instructions: ['Ajoelhe-se de frente para a polia alta', 'Segure a corda atrás da cabeça/pescoço', 'Flexione o tronco contraindo o abdômen', 'Volte controlado'],
      tips: 'O movimento vem da flexão do tronco, não dos braços puxando a corda.' },
    { id: 'plank', name: 'Prancha Isométrica', muscleGroup: ['Core', 'Abdômen'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '30–45s', rest: 45, category: 'Core', isTime: true,
      instructions: ['Apoie antebraços e pontas dos pés no chão', 'Mantenha o corpo alinhado, sem elevar o quadril', 'Segure a posição contraindo o abdômen'],
      tips: 'Não deixe o quadril cair — core sempre contraído.' },
    { id: 'crunch', name: 'Abdominal Crunch', muscleGroup: ['Reto abdominal'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '20', rest: 30, category: 'Core',
      instructions: ['Deite com joelhos flexionados, pés no chão', 'Mãos atrás da cabeça ou cruzadas no peito', 'Eleve o tronco contraindo o abdômen', 'Desça controlado'],
      tips: 'Não puxe o pescoço com as mãos — o movimento vem do abdômen.' },
    { id: 'leg_raise', name: 'Elevação de Pernas', muscleGroup: ['Abdômen inferior'], difficulty: 'Intermediário', equipment: 'bodyweight', sets: 3, reps: '12–15', rest: 45, category: 'Core',
      instructions: ['Deitado, pernas estendidas', 'Eleve as pernas até 90°', 'Desça sem tocar o chão totalmente'],
      tips: 'Lombar sempre apoiada no chão.' },
    { id: 'russian_twist', name: 'Giro Russo', muscleGroup: ['Oblíquos'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '20 total', rest: 30, category: 'Core',
      instructions: ['Sente com os joelhos flexionados, tronco levemente reclinado', 'Gire o tronco de um lado para o outro', 'Mantenha o core contraído'],
      tips: 'Quanto mais lento, mais intenso.' },
    { id: 'dead_bug', name: 'Dead Bug', muscleGroup: ['Core profundo', 'Estabilizadores'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '10 cada', rest: 30, category: 'Core',
      instructions: ['Deite de costas, braços e joelhos apontando para o teto (90°)', 'Estenda um braço e a perna oposta simultaneamente', 'Volte e alterne o lado'],
      tips: 'Mantenha a lombar sempre em contato com o chão durante o movimento.' },
  ],
  cardio: [
    { id: 'jumping_jack', name: 'Polichinelo', muscleGroup: ['Cardiovascular'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '40', rest: 30, category: 'Cardio',
      instructions: ['Em pé, pés juntos, braços ao lado do corpo', 'Salte abrindo pernas e braços simultaneamente', 'Volte à posição inicial no salto seguinte'],
      tips: 'Amorteça o salto flexionando levemente os joelhos ao aterrissar.' },
    { id: 'high_knees', name: 'Corrida Estacionária', muscleGroup: ['Cardiovascular', 'Core'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '30s', rest: 30, category: 'Cardio', isTime: true,
      instructions: ['Em pé, corra no lugar', 'Eleve os joelhos até a altura do quadril', 'Mantenha ritmo constante pelo tempo indicado'],
      tips: 'Apoie na ponta dos pés para reduzir o impacto nas articulações.' },
    { id: 'step_touch', name: 'Step Touch', muscleGroup: ['Cardiovascular'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '45s', rest: 30, category: 'Cardio', isTime: true,
      instructions: ['Dê um passo lateral com um pé', 'Toque o outro pé ao lado', 'Repita alternando os lados'],
      tips: 'Bom exercício de baixo impacto para aquecimento ou quem tem limitação nos joelhos.' },
    { id: 'burpee', name: 'Burpee', muscleGroup: ['Corpo todo'], difficulty: 'Intermediário', equipment: 'bodyweight', sets: 3, reps: '10', rest: 60, category: 'Cardio',
      instructions: ['Comece em pé', 'Agache e apoie as mãos no chão', 'Jogue os pés para trás em posição de flexão', 'Volte os pés e salte para cima'],
      tips: 'Pode retirar o salto final se for iniciante — o exercício continua eficaz.' },
    { id: 'march_place', name: 'Marcha Estacionária', muscleGroup: ['Cardiovascular'], difficulty: 'Iniciante', equipment: 'bodyweight', sets: 3, reps: '60s', rest: 20, category: 'Cardio', isTime: true,
      instructions: ['Em pé, marche no lugar elevando os joelhos moderadamente', 'Balance os braços naturalmente', 'Mantenha o ritmo pelo tempo indicado'],
      tips: 'Ótimo para aquecimento de baixo impacto antes das séries de força.' },
    { id: 'treadmill', name: 'Esteira', muscleGroup: ['Cardiovascular'], difficulty: 'Iniciante', equipment: 'cardio_machine', sets: 1, reps: '10 min', rest: 0, category: 'Cardio', isTime: true,
      instructions: ['Comece em velocidade baixa para aquecer', 'Aumente gradualmente até um ritmo confortável de caminhada/corrida leve', 'Reduza a velocidade nos últimos minutos para desacelerar'],
      tips: 'Sempre segure o corrimão ao subir/descer da esteira em movimento.' },
    { id: 'bike_cardio', name: 'Bike Ergométrica', muscleGroup: ['Cardiovascular'], difficulty: 'Iniciante', equipment: 'cardio_machine', sets: 1, reps: '10 min', rest: 0, category: 'Cardio', isTime: true,
      instructions: ['Ajuste a altura do banco antes de começar (joelho levemente flexionado no ponto mais baixo)', 'Pedale em ritmo constante', 'Ajuste a resistência conforme o conforto'],
      tips: 'Assento muito baixo sobrecarrega o joelho — ajuste antes de pedalar.' },
  ],
};

// Aceita tanto um único objetivo (string) quanto uma lista (array) —
// funciona independentemente de qual formato quem chamar usar.
function normalizeGoals(goalsOrGoal) {
  if (Array.isArray(goalsOrGoal)) return goalsOrGoal;
  if (typeof goalsOrGoal === 'string' && goalsOrGoal) return [goalsOrGoal];
  return [];
}

export function filterByEquipment(exercises, equipment) {
  if (!equipment || equipment.length === 0) return exercises.filter(e => e.equipment === 'bodyweight');
  return exercises.filter(ex => ex.equipment === 'bodyweight' || equipment.includes(ex.equipment));
}

export function filterByLevel(exercises, level) {
  if (level === 'beginner') return exercises.filter(e => e.difficulty === 'Iniciante');
  if (level === 'intermediate') return exercises;
  return exercises;
}

// Exercícios bloqueados por limitação física. Exportado para o catálogo do
// backend (backend/scripts/sync-catalog.ts) usar exatamente a mesma regra.
export const LIMITATION_BLOCKED = {
  knee: ['squat', 'lunge', 'goblet_squat', 'jumping_jack', 'burpee', 'high_knees', 'wall_sit', 'sumo_squat', 'leg_press_ex', 'smith_squat', 'leg_extension'],
  shoulder: ['shoulder_press', 'pike_pushup', 'db_press', 'front_raise', 'lateral_raise', 'pushup', 'shoulder_machine_press', 'cable_lateral_raise', 'smith_bench_press'],
  back: ['rdl', 'superman', 'row_db', 'pullover', 'deadlift', 'seated_cable_row', 'lat_pulldown_ex'],
};

// Exercícios de impacto, removidos quando getIMCRecommendations marca
// avoidHighImpact (menor de 18, 46+ e obesidade). Lista única: o backend lê esta
// mesma constante pelo catálogo gerado (backend/scripts/sync-catalog.ts).
export const HIGH_IMPACT_IDS = ['jumping_jack', 'burpee', 'high_knees'];

export function filterHighImpact(exercises, avoidHighImpact) {
  if (!avoidHighImpact) return exercises;
  return exercises.filter(e => !HIGH_IMPACT_IDS.includes(e.id));
}

export function filterByLimitation(exercises, limitation) {
  if (!limitation || limitation === 'none') return exercises;
  return exercises.filter(e => !(LIMITATION_BLOCKED[limitation] || []).includes(e.id));
}

function applyIMCRecommendations(exercises, recs) {
  return exercises.map(ex => ({
    ...ex,
    sets: Math.round(ex.sets * recs.setsMultiplier),
    rest: Math.max(30, ex.rest + (recs.restBetweenSets - 60)),
  }));
}

function pickExercises(pool, count) {
  return pool.slice(0, count).filter(Boolean);
}

// Limites de exercícios por tempo de sessão — generosos para aproveitar
// bem o equipamento disponível em combos maiores (DUO/TRIPLE/PRIME/ELITE).
function adjustForTime(exercises, time) {
  const limits = { 30: 6, 45: 8, 60: 10, 90: 12 };
  const key = Object.keys(limits).reverse().find(k => time >= parseInt(k)) || 30;
  return exercises.slice(0, limits[key]);
}

export function generateWorkoutPlan({ goals, goal, level, days, time, equipment, focus, limitation, imcCategory, gender, ageGroup }) {
  const goalList = normalizeGoals(goals || goal);
  const recs = getIMCRecommendations(imcCategory, goalList, gender, ageGroup);
  const numSeries = Math.min(parseInt(days) || 3, 3);

  const db = {};
  for (const [key, exList] of Object.entries(EXERCISE_DB)) {
    let filtered = filterByEquipment(exList, equipment);
    filtered = filterByLevel(filtered, level);
    filtered = filterByLimitation(filtered, limitation);
    filtered = filterHighImpact(filtered, recs.avoidHighImpact);
    filtered = applyIMCRecommendations(filtered, recs);
    db[key] = filtered;
  }

  // Cardio no início se IMC ou objetivo indicar
  const cardioWarmup = recs.cardioFirst ? [db.cardio[0]].filter(Boolean) : [];

  const plans = [];

  // === SÉRIE A — Empurrar (Peito, Ombros, Tríceps) ===
  let exA = [...cardioWarmup];
  if (focus === 'lower') {
    exA.push(...pickExercises(db.legs, 5));
    exA.push(...pickExercises(db.glutes, 3));
  } else if (focus === 'upper') {
    exA.push(...pickExercises(db.chest, 3));
    exA.push(...pickExercises(db.shoulders, 3));
    exA.push(...pickExercises(db.arms.filter(e => e.id.includes('tricep') || e.id.includes('cable_push')), 2));
  } else {
    exA.push(...pickExercises(db.chest, 3));
    exA.push(...pickExercises(db.shoulders, 2));
    exA.push(...pickExercises(db.arms.filter(e => e.id.includes('tricep') || e.id.includes('cable_push')), 2));
    exA.push(...pickExercises(db.core, 2));
  }
  // Feminino: prioriza glúteos na Série A
  if (gender === 'female' && focus !== 'upper') {
    exA.push(...pickExercises(db.glutes, 2));
  }

  plans.push({
    serie: 'A',
    name: focus === 'lower' ? 'Série A — Pernas e Glúteos' : focus === 'upper' ? 'Série A — Peito e Ombros' : 'Série A — Peito, Ombros e Tríceps',
    category: focus === 'lower' ? 'Pernas' : 'Peito',
    focus: focus === 'lower' ? 'Pernas e Glúteos' : 'Peito e Ombros',
    exercises: adjustForTime(exA, time),
    personalNotes: recs.notes,
  });

  if (numSeries >= 2) {
    // === SÉRIE B — Puxar (Costas, Bíceps) ===
    let exB = [...cardioWarmup];
    if (focus === 'lower') {
      exB.push(...pickExercises(db.legs.slice(3), 3));
      exB.push(...pickExercises(db.glutes.slice(2), 3));
      exB.push(...pickExercises(db.core, 3));
    } else if (focus === 'upper') {
      exB.push(...pickExercises(db.back, 3));
      exB.push(...pickExercises(db.arms.filter(e => e.id.includes('curl')), 3));
      exB.push(...pickExercises(db.core, 2));
    } else {
      exB.push(...pickExercises(db.back, 3));
      exB.push(...pickExercises(db.arms.filter(e => e.id.includes('curl')), 3));
      exB.push(...pickExercises(db.core.slice(1), 2));
    }

    plans.push({
      serie: 'B',
      name: focus === 'lower' ? 'Série B — Variação de Pernas' : 'Série B — Costas e Bíceps',
      category: 'Costas',
      focus: focus === 'lower' ? 'Pernas e Core' : 'Costas e Bíceps',
      exercises: adjustForTime(exB, time),
      personalNotes: recs.notes,
    });
  }

  if (numSeries >= 3) {
    // === SÉRIE C — Pernas / Core / Cardio ===
    let exC = [...cardioWarmup];
    if (focus === 'core') {
      exC.push(...pickExercises(db.core, 5));
      exC.push(...pickExercises(db.cardio, 3));
    } else if (focus === 'upper') {
      exC.push(...pickExercises(db.legs, 4));
      exC.push(...pickExercises(db.core, 3));
      exC.push(...pickExercises(db.cardio.slice(1), 2));
    } else {
      exC.push(...pickExercises(db.legs.slice(1), 4));
      exC.push(...pickExercises(db.glutes.slice(2), 3));
      exC.push(...pickExercises(db.core, 3));
      if (goalList.includes('lose_weight')) exC.push(...pickExercises(db.cardio.slice(1), 2));
    }

    plans.push({
      serie: 'C',
      name: focus === 'core' ? 'Série C — Core e Cardio' : 'Série C — Pernas e Core',
      category: 'Pernas',
      focus: 'Pernas e Core',
      exercises: adjustForTime(exC, time),
      personalNotes: recs.notes,
    });
  }

  // Ajuste final por objetivo
  return plans.map(plan => ({
    ...plan,
    exercises: plan.exercises.filter(Boolean).map(ex => ({
      ...ex,
      sets: goalList.includes('gain_muscle') ? Math.min((ex.sets || 3) + 1, 5) : (ex.sets || 3),
      rest: goalList.includes('lose_weight') ? Math.max((ex.rest || 60) - 15, 30) : (ex.rest || 60),
    })),
  }));
}

// Monta as séries a partir de um plano "por ids" (resposta validada da IA do
// backend): { series: [{ serie, name, focus, exercises: [{ id, sets, reps, rest }] }] }.
// Os dados completos de cada exercício (instruções, dicas, músculos...) vêm do
// EXERCISE_DB local; ids desconhecidos são ignorados. O resultado tem o mesmo
// formato de generateWorkoutPlan, então o resto do app não muda.
export function hydratePlan(plan, { goals, gender, ageGroup, imcCategory } = {}) {
  const byId = {};
  for (const list of Object.values(EXERCISE_DB)) {
    for (const ex of list) byId[ex.id] = ex;
  }
  const recs = getIMCRecommendations(imcCategory, normalizeGoals(goals), gender, ageGroup);

  return (plan?.series || []).map(s => {
    const exercises = (s.exercises || [])
      .map(item => {
        const base = byId[item.id];
        if (!base) return null;
        return {
          ...base,
          sets: item.sets ?? base.sets,
          reps: item.reps ?? base.reps,
          rest: item.rest ?? base.rest,
        };
      })
      .filter(Boolean);
    const firstStrength = exercises.find(e => e.category !== 'Cardio') || exercises[0];
    return {
      serie: s.serie,
      name: s.name,
      category: firstStrength?.category || 'Treino',
      focus: s.focus,
      exercises,
      personalNotes: recs.notes,
    };
  });
}
