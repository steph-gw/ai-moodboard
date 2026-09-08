import { GWMoodboard } from './index';

const el = document.getElementById('root');
if (!el) throw new Error('dev harness: #root missing');

GWMoodboard.mount(el);
