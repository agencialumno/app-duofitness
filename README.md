# 🏋️ Duo Fitness

App de academia para condomínios. Gerencie séries, aprenda exercícios e gamifique sua jornada fitness.

## Cores
- Primária: `#fed205` (amarelo)
- Fundo: `#000000` (preto)

---

## ⚡ Setup rápido

### 1. Pré-requisitos
- Node.js 18+ → https://nodejs.org
- Expo Go no celular → Play Store

### 2. Instalar dependências
```bash
npm install
```

### 3. Rodar
```bash
npx expo start
```
Escanear o QR com o Expo Go (celular na mesma rede Wi-Fi).

---

## 📁 Estrutura

```
DuoFitness/
├── App.js                          # Entrada, verifica onboarding
├── src/
│   ├── context/
│   │   └── AppContext.js           # Estado global: user, XP, streak, conquistas
│   ├── navigation/
│   │   ├── RootNavigator.js        # Onboarding vs Main
│   │   ├── OnboardingNavigator.js  # Fluxo de cadastro
│   │   └── MainNavigator.js        # Bottom tabs
│   ├── screens/
│   │   ├── onboarding/
│   │   │   ├── WelcomeScreen.js    # Tela inicial
│   │   │   ├── ProfileSetupScreen.js
│   │   │   └── LevelSelectScreen.js
│   │   ├── HomeScreen.js           # Dashboard com XP e streak
│   │   ├── WorkoutsScreen.js       # Lista de treinos
│   │   ├── WorkoutDetailScreen.js  # Detalhe do treino
│   │   ├── CreateWorkoutScreen.js  # Criar treino
│   │   ├── ActiveWorkoutScreen.js  # Treino ativo com timer
│   │   ├── ExercisesScreen.js      # Biblioteca de exercícios
│   │   ├── ExerciseDetailScreen.js # Instruções do exercício
│   │   └── ProfileScreen.js        # Perfil e conquistas
│   ├── data/
│   │   └── exercises.js            # 10 exercícios com instruções
│   └── utils/
│       └── theme.js                # Cores, fontes, espaçamentos
└── assets/
    └── (logo.png, icon.png...)     # Adicionar sua logo aqui
```

---

## 🎮 Gamificação

- **XP**: +50 por treino concluído
- **Streak**: sequência de dias consecutivos
- **Níveis**: Iniciante → Ativo → Dedicado → Avançado → Elite → Lenda
- **Conquistas**: Primeiro treino, 7 treinos, 30 treinos, streaks de 3, 7 dias, 500 XP, 1000 XP

---

## 🔮 Funcionalidades futuras (código preparado)

O AppContext já tem a estrutura para:

1. **Duo Mode** — adicionar `partnerId` no user e sessions compartilhadas
2. **Ranking do condomínio** — via API backend (sessions já têm timestamp)
3. **Agendamento** — adicionar `schedule[]` no workout
4. **IA Personal Trainer** — integrar Claude API no CreateWorkoutScreen
5. **Push notifications** — Expo Notifications (instalação simples)
6. **Histórico detalhado** — sessions já salvas com timestamp e workoutId

---

## 📦 Gerar APK

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login Expo
eas login

# Configurar build
eas build:configure

# Gerar APK de preview (sem precisar de conta dev)
eas build -p android --profile preview
```

O APK será gerado na nuvem (~10 min) e você baixa o link.

---

## 🖼️ Adicionar logo

1. Salve sua logo como `assets/logo.png` (fundo transparente, PNG)
2. No `WelcomeScreen.js`, substitua o `<View style={styles.logoPlaceholder}>` por:
```jsx
import { Image } from 'react-native';
// ...
<Image source={require('../../assets/logo.png')} style={{ width: 90, height: 90 }} resizeMode="contain" />
```
