import React from 'react';
import {createRoot} from 'react-dom/client';
import RadarDashboard from './radar-dashboard';
import {createLocalApi,indexedStore} from './workspace.mjs';
import {createConnector} from './connector.mjs';
import {backendUrl,backendBlocker} from './backend-config.mjs';
import '../../app/radar.css';
import './local.css';
createRoot(document.getElementById('root')!).render(<RadarDashboard apiClient={createLocalApi(indexedStore(),{remote:createConnector(backendUrl,fetch,backendBlocker)})}/>);
