import React, { useState, useRef, useEffect } from 'react';
import { BuildingOffice2Icon, ChevronDownIcon, ClockIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { PlantaId } from '../types/branded';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
    const { activePlanta, userPlants, switchPlanta } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentDateTime(new Date()), 1000); // Update every second
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSwitchPlanta = (plantaId: number) => {
        switchPlanta(plantaId as PlantaId);
        setIsDropdownOpen(false);
    };
    
    const formattedDateTime = format(currentDateTime, "eeee, d 'de' MMMM, HH:mm:ss", { locale: es });
    const capitalizedDateTime = formattedDateTime.charAt(0).toUpperCase() + formattedDateTime.slice(1);

  return (
    <header className="bg-surface shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div>
            {activePlanta ? (
                userPlants.length > 1 ? (
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-1 text-sm text-text-secondary hover:text-text-primary focus:outline-none transition-colors">
                            <span>{activePlanta.nombre_planta}</span>
                            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}/>
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute mt-2 w-56 rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    {userPlants.map(planta => (
                                        <button
                                            key={planta.id}
                                            onClick={() => handleSwitchPlanta(planta.id)}
                                            className="w-full text-left block px-4 py-2 text-sm text-text-primary hover:bg-background"
                                            role="menuitem"
                                        >
                                            {planta.nombre_planta}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-sm text-text-secondary flex items-center gap-1.5">
                        <BuildingOffice2Icon className="h-4 w-4" />
                        {activePlanta.nombre_planta}
                    </span>
                )
            ) : (
                <span className="text-sm text-text-secondary">BioGas Corp</span>
            )}

            <h1 className="text-xl font-bold text-primary" data-testid="page-title">{title}</h1>
          </div>
           <div className="flex items-center space-x-2 p-2 rounded-md text-sm text-text-secondary font-medium">
            <ClockIcon className="h-5 w-5" aria-hidden="true" />
            <span className="hidden md:block">{capitalizedDateTime}</span>
            <span className="md:hidden">{format(currentDateTime, "d/MM/yy, HH:mm:ss")}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
