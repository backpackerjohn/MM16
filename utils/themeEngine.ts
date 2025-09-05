import { ThemeName, Chunk, ScheduleEvent, EnergyTag, ContextTag, DNDWindow } from '../types';

interface ThemeContext {
    activeChunk: Chunk | null;
    currentEvents: ScheduleEvent[];
    scheduleEvents: ScheduleEvent[];
    currentTime: Date;
    dndWindows: DNDWindow[];
}

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

export const determineOptimalTheme = (context: ThemeContext): ThemeName => {
    const { activeChunk, currentEvents, scheduleEvents, currentTime, dndWindows } = context;
    const currentHour = currentTime.getHours();
    const currentDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentTime.getDay()] as ScheduleEvent['day'];
    const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    // Priority 1: Evening theme (sensory wind-down)
    if (currentHour >= 19 || currentHour < 5) {
        return 'Evening';
    }

    // Priority 2: DND windows for forced focus
    const activeDndWindow = dndWindows.find(w => w.day === currentDayOfWeek);
    if (activeDndWindow && activeDndWindow.startTime && activeDndWindow.endTime) {
        const dndStart = timeToMinutes(activeDndWindow.startTime);
        const dndEnd = timeToMinutes(activeDndWindow.endTime);

        if (dndEnd < dndStart) { // Overnight DND
            if (currentTimeInMinutes >= dndStart || currentTimeInMinutes < dndEnd) {
                return 'Focus';
            }
        } else { // Same-day DND
            if (currentTimeInMinutes >= dndStart && currentTimeInMinutes < dndEnd) {
                return 'Focus';
            }
        }
    }

    // Priority 3: Upcoming high-focus event
    const upcomingEvents = scheduleEvents
        .filter(e => e.day === currentDayOfWeek && timeToMinutes(e.startTime) > currentTimeInMinutes)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    if (upcomingEvents.length > 0) {
        const nextEvent = upcomingEvents[0];
        const timeUntilNextEvent = timeToMinutes(nextEvent.startTime) - currentTimeInMinutes;

        if (timeUntilNextEvent <= 30) { // 30 minutes prep time
            const isHighFocus = nextEvent.contextTags?.includes(ContextTag.Work) || nextEvent.contextTags?.includes(ContextTag.HighEnergy);
            if (isHighFocus) {
                return 'Focus';
            }
        }
    }

    // Priority 4: Active Momentum Map Chunk
    if (activeChunk && !activeChunk.isComplete) {
        switch (activeChunk.energyTag) {
            case EnergyTag.Tedious:
            case EnergyTag.Admin:
                return 'Focus';
            case EnergyTag.Creative:
            case EnergyTag.Social:
                return 'Creative';
            case EnergyTag.Errand:
                return 'Recovery';
            default:
                return 'Creative';
        }
    }
    
    // Priority 5: Current Scheduled Events (Anchors)
    if (currentEvents.length > 0) {
        const hasRushedTag = currentEvents.some(event => 
            event.contextTags?.includes(ContextTag.Rushed)
        );
        if (hasRushedTag) {
            return 'Focus';
        }

        const hasHighEnergyTag = currentEvents.some(event => 
            event.contextTags?.includes(ContextTag.HighEnergy) ||
            event.contextTags?.includes(ContextTag.Work)
        );
        if (hasHighEnergyTag) {
            return 'Focus';
        }
        
        const hasRelaxedTag = currentEvents.some(event => 
            event.contextTags?.includes(ContextTag.Relaxed)
        );
        if (hasRelaxedTag) {
            return 'Recovery';
        }

        const hasLowEnergyTag = currentEvents.some(event => 
            event.contextTags?.includes(ContextTag.LowEnergy) ||
            event.contextTags?.includes(ContextTag.Recovery)
        );
        if (hasLowEnergyTag) {
            return 'Recovery';
        }
    }

    // Default theme if no other context applies
    return 'Creative';
};