// Content script entry point
import { initialize } from './content';

console.log('[SS-BG Content] Content script loaded!');
console.log('[SS-BG Content] Page URL:', window.location.href);

initialize();

