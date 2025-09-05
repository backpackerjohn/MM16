import React, { useState, useEffect } from 'react';
import { ScheduleEvent } from '../types';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';

interface AddAnchorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; startTime: string; endTime: string; days: ScheduleEvent['day'][] }) => void;
}

const DAYS_OF_WEEK: { long: ScheduleEvent['day']; short: string }[] = [
    { long: 'Monday', short: 'Mon' },
    { long: 'Tuesday', short: 'Tue' },
    { long: 'Wednesday', short: 'Wed' },
    { long: 'Thursday', short: 'Thu' },
    { long: 'Friday', short: 'Fri' },
    { long: 'Saturday', short: 'Sat' },
    { long: 'Sunday', short: 'Sun' },
];

const AddAnchorModal: React.FC<AddAnchorModalProps> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [selectedDays, setSelectedDays] = useState<ScheduleEvent['day'][]>([]);
    const [errors, setErrors] = useState<{ title?: string; time?: string; days?: string }>({});

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setTitle('');
            setStartTime('09:00');
            setEndTime('10:00');
            setSelectedDays([]);
            setErrors({});
        }
    }, [isOpen]);

    const validate = () => {
        const newErrors: { title?: string; time?: string; days?: string } = {};
        if (!title.trim()) {
            newErrors.title = "Every anchor needs a name!";
        }
        if (!startTime || !endTime) {
            newErrors.time = "Don't forget to set the start and end times.";
        } else if (new Date(`1970-01-01T${startTime}`) >= new Date(`1970-01-01T${endTime}`)) {
            newErrors.time = "Oops! The end time needs to be after the start time.";
        }
        if (selectedDays.length === 0) {
            newErrors.days = "Which day(s) should this be on?";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleToggleDay = (day: ScheduleEvent['day']) => {
        const newSelectedDays = selectedDays.includes(day) 
            ? selectedDays.filter(d => d !== day) 
            : [...selectedDays, day];
        setSelectedDays(newSelectedDays);
        if(errors.days && newSelectedDays.length > 0) {
            setErrors(prev => ({...prev, days: undefined}));
        }
    };

    const handleSubmit = () => {
        if (validate()) {
            onSave({ title, startTime, endTime, days: selectedDays });
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog" aria-modal="true" aria-labelledby="add-anchor-title"
        >
            <div
                className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <h2 id="add-anchor-title" className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Add a New Anchor</h2>
                <div className="space-y-6">
                    <div>
                        <div className="relative">
                            <input
                                id="anchor-title"
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                onBlur={validate}
                                placeholder=" "
                                className={`peer block px-4 pb-2.5 pt-4 w-full text-sm text-[var(--color-text-primary)] bg-transparent rounded-lg border appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)] ${errors.title ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                                autoFocus
                            />
                            <label
                                htmlFor="anchor-title"
                                className="absolute text-sm text-[var(--color-text-subtle)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-4 peer-focus:text-[var(--color-primary-accent)] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 pointer-events-none"
                            >
                                Anchor Name (e.g., Gym Session)
                            </label>
                        </div>
                        {errors.title && <p className="flex items-center gap-1 mt-2 text-sm text-[var(--color-danger)]"><ExclamationCircleIcon className="h-4 w-4" />{errors.title}</p>}
                    </div>

                    <div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start-time" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Start Time</label>
                                <input
                                    id="start-time"
                                    type="time"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    onBlur={validate}
                                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary-accent)] bg-transparent ${errors.time ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                                />
                            </div>
                            <div>
                                <label htmlFor="end-time" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">End Time</label>
                                <input
                                    id="end-time"
                                    type="time"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    onBlur={validate}
                                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary-accent)] bg-transparent ${errors.time ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                                />
                            </div>
                        </div>
                        {errors.time && <p className="flex items-center gap-1 mt-2 text-sm text-[var(--color-danger)]"><ExclamationCircleIcon className="h-4 w-4" />{errors.time}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Repeats On</label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map(day => (
                                <button
                                    key={day.long}
                                    onClick={() => handleToggleDay(day.long)}
                                    className={`px-3 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors ${
                                        selectedDays.includes(day.long) 
                                        ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' 
                                        : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'
                                    }`}
                                >
                                    {day.short}
                                </button>
                            ))}
                        </div>
                         {errors.days && <p className="flex items-center gap-1 mt-2 text-sm text-[var(--color-danger)]"><ExclamationCircleIcon className="h-4 w-4" />{errors.days}</p>}
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 font-semibold text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="px-5 py-2 font-bold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg shadow-sm">
                        Save Anchor
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddAnchorModal;
