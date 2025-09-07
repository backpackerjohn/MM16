import React from 'react';
import DashboardIcon from './icons/DashboardIcon';
import MomentumMapIcon from './icons/MomentumMapIcon';
import BrainDumpIcon from './icons/BrainDumpIcon';
import TaskIcon from './icons/TaskIcon';
import CalendarIcon from './icons/CalendarIcon';
import GearIcon from './icons/GearIcon';

interface MobileTabBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { name: 'Dashboard', icon: DashboardIcon, page: 'Dashboard' },
    { name: 'Map', icon: MomentumMapIcon, page: 'Momentum Map' },
    { name: 'Brain Dump', icon: BrainDumpIcon, page: 'Brain Dump' },
    { name: 'Tasks', icon: TaskIcon, page: 'Task' },
    { name: 'Calendar', icon: CalendarIcon, page: 'Calendar' },
    { name: 'Settings', icon: GearIcon, page: 'Settings' },
  ];

  return (
    <nav className="mobile-tab-bar" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.page;
        return (
          <button
            key={item.name}
            onClick={() => onNavigate(item.page)}
            className={`tab-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-6 w-6" />
            <span>{item.name}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
