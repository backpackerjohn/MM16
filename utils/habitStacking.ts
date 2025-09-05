import { MicroHabit, HabitCategory, HabitEnergyRequirement, EnergyTag } from '../types';

export const habitDatabase: MicroHabit[] = [
    // Physical Habits
    {
        id: 'habit-stretch-neck',
        name: 'Mindful Neck Rolls',
        description: 'Gently roll your neck from side to side to release tension from focused work.',
        category: HabitCategory.Physical,
        durationMinutes: 1,
        energyRequirement: HabitEnergyRequirement.Low,
        optimalContexts: { energyTags: [EnergyTag.Tedious, EnergyTag.Admin, EnergyTag.Creative] },
    },
    {
        id: 'habit-hydrate',
        name: 'Sip of Water',
        description: 'Take a moment to hydrate. Proper hydration is key for focus and energy.',
        category: HabitCategory.Physical,
        durationMinutes: 1,
        energyRequirement: HabitEnergyRequirement.Low,
        optimalContexts: {},
    },
    {
        id: 'habit-stand-walk',
        name: 'Quick Stand & Walk',
        description: 'Stand up, stretch your legs, and walk around your room for a minute to get blood flowing.',
        category: HabitCategory.Physical,
        durationMinutes: 2,
        energyRequirement: HabitEnergyRequirement.Medium,
        optimalContexts: { energyTags: [EnergyTag.Tedious, EnergyTag.Admin] },
    },

    // Cognitive Habits
    {
        id: 'habit-deep-breath',
        name: 'Box Breathing',
        description: 'Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s. Repeat 3 times to reset your nervous system.',
        category: HabitCategory.Cognitive,
        durationMinutes: 1,
        energyRequirement: HabitEnergyRequirement.Low,
        optimalContexts: { energyTags: [EnergyTag.Creative, EnergyTag.Social] },
    },
    {
        id: 'habit-gratitude',
        name: 'One Small Win',
        description: 'Take 30 seconds to acknowledge one small thing you did well in that last chunk.',
        category: HabitCategory.Cognitive,
        durationMinutes: 1,
        energyRequirement: HabitEnergyRequirement.Low,
        optimalContexts: {},
    },
    {
        id: 'habit-next-step',
        name: 'Plan Next Micro-Step',
        description: 'Jot down the very next physical action for your upcoming task. Make it tiny!',
        category: HabitCategory.Cognitive,
        durationMinutes: 2,
        energyRequirement: HabitEnergyRequirement.Medium,
        optimalContexts: { energyTags: [EnergyTag.Creative, EnergyTag.Admin] },
    },

    // Transitional Habits
    {
        id: 'habit-tidy-space',
        name: '2-Minute Tidy',
        description: 'Reset your workspace. A clear space leads to a clear mind.',
        category: HabitCategory.Transitional,
        durationMinutes: 2,
        energyRequirement: HabitEnergyRequirement.Medium,
        optimalContexts: {},
    },
    {
        id: 'habit-posture-check',
        name: 'Posture Reset',
        description: 'Sit or stand up straight, roll your shoulders back, and align your head over your spine.',
        category: HabitCategory.Transitional,
        durationMinutes: 1,
        energyRequirement: HabitEnergyRequirement.Low,
        optimalContexts: { energyTags: [EnergyTag.Tedious, EnergyTag.Admin] },
    },
];


interface HabitContext {
    completedEnergyTag: EnergyTag;
    // We can add more context later, like time of day
}

let lastSuggestedHabitId: string | null = null;

export const getHabitSuggestion = (context: HabitContext): MicroHabit | null => {
    const { completedEnergyTag } = context;

    // Filter habits that are suitable for the context and are not the one just suggested
    let suitableHabits = habitDatabase.filter(habit => {
        const isNotLastSuggested = habit.id !== lastSuggestedHabitId;
        const hasNoContext = !habit.optimalContexts.energyTags || habit.optimalContexts.energyTags.length === 0;
        const matchesContext = habit.optimalContexts.energyTags?.includes(completedEnergyTag);
        
        return isNotLastSuggested && (hasNoContext || matchesContext);
    });

    // If filtering results in an empty list (e.g., the only suitable habit was the last one suggested),
    // then fall back to the full list minus the last suggested.
    if (suitableHabits.length === 0) {
        suitableHabits = habitDatabase.filter(habit => habit.id !== lastSuggestedHabitId);
    }
    
    // If there's still nothing, something is wrong, but we can return null
    if (suitableHabits.length === 0) {
        return habitDatabase.length > 0 ? habitDatabase[0] : null;
    }

    const randomIndex = Math.floor(Math.random() * suitableHabits.length);
    const suggestion = suitableHabits[randomIndex];
    
    lastSuggestedHabitId = suggestion.id; // Remember what we suggested
    return suggestion;
};
