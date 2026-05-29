
import React from 'react';
import { ProjectProvider } from './context/ProjectContext';
import { ThemeProvider } from './context/ThemeContext';
import { MainWorkspace } from './components/MainWorkspace';
import { HotkeyEngineProvider, defaultKeymap } from './hotkeys';

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <ProjectProvider>
                <HotkeyEngineProvider defaultKeymap={defaultKeymap}>
                    <MainWorkspace />
                </HotkeyEngineProvider>
            </ProjectProvider>
        </ThemeProvider>
    );
}

export default App;
