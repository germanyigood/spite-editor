
import React from 'react';
import { ProjectProvider } from './context/ProjectContext';
import { ThemeProvider } from './context/ThemeContext';
import { MainWorkspace } from './components/MainWorkspace';

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <ProjectProvider>
                <MainWorkspace />
            </ProjectProvider>
        </ThemeProvider>
    );
}

export default App;
