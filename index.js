/**
 * CaltransBizConnect - Root Entry Point
 * Redirects to the actual server logic in server/index.js
 * This ensures that hosting environments using index.js as a default start the correct app.
 */
require('./server/index.js');
