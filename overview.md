FTC Companion App v3

- Functionality stuff  
  * It should appear as a normal iphone app on mobile, with a bottom tab menu with easy access to start a scout report.   
  * There should be an information sharing system, where people can scan qr codes to link their apps so that any scouts that one person on a team does will appear on other people’s phones.   
  * Schedules should also be shared, in v3 there will be basic manual data input, where the user will have to input schedule data manually.   
    * V4 will include api’s, with automatic schedule fetching from ftc databases.   
  * Users will also have to input all the teams that are at the competition.   
  * When a match is going to start in a few minutes, the app should send a push notification so that the phone will get a notification even if the phone is off, reminding students to get ready for the match.   
- Technical stuff  
  * The app should be a website–but still prioritize mobile usage, with minimal pc support, but still usable on pc.   
    * It should appear as if it was a mobile app, instead of a clunky website that the developers forgot to add mobile support to and slapped it on at the end.   
  * The website will be hosted on vercel, with backend on firebase. It should be able to function with a lot of people on it at once.   
- Visual stuff  
  * It should have a consistent dark color scheme, with the option to set it to dark mode in the settings. (make sure it isnt hard to find)  
  * Do not use the generic ai gradients–basic and obviously ai generated blue-purple gradient.   
  * Color palettes  
    * Dark mode  
      * Background: \#0F1115  
      * Surface: \#181B22  
      * Card: \#22262F  
      * Primary: \#FF8A00  
      * Primary Hover: \#FF9F2E  
      * Success: \#22C55E  
      * Warning: \#F59E0B  
      * Danger: \#EF4444  
      * Text Primary: \#F8FAFC  
      * Text Secondary: \#94A3B8  
      * Border: \#2D3440  
    * Light mode  
      * Background: \#F8FAFC  
      * Surface: \#FFFFFF  
      * Card: \#FFFFFF  
      * Primary: \#FF8A00  
      * Primary Hover: \#E67A00  
      * Text Primary: \#0F172A  
      * Text Secondary: \#64748B  
      * Border: \#E2E8F0  
    * Make sure to use this orange color for the main app buttons and highlights, and use these red and blue alliance colors for alliance specific stuff to erase confusion  
      * Red Alliance: \#EF4444  
      * Blue Alliance: \#3B82F6  
  * The app should be highly responsive, with fluid animations and responses for every action, giving the user much needed feedback in the crowded	 environment of ftc competitions.  
  * Try to make the floating dock at the bottom have an apple-similar aesthetic, with the frosted glass and sliding blob.   
- Different pages  
  * Home page  
    * Should show the upcoming match, and the countdown to that match.   
      * When you press the upcoming match, it should show match information: whos on red alliance or blue alliance (there are only 2 teams per alliance)  
        * You should be able to see any information that you have collected on the teams on both alliances when you click on a team.   
    * Should show the next matches  
      * Times for the next matches should be shown next to them.   
    * There should be a ‘scout next’, with the team number and who to scout based on what match they are in and why you need to scout them.   
    * Team reminders:  
      * Reminders that can be set to remind people to do tasks  
        * Something like replace battery or fix auto  
  * Schedule page  
    * Near the bottom of the page, there should be a button to input the schedule, with a modular based system with one card per match, where you can input time and who is on each alliance.   
      * Under the card, there should be a plus button to add another card for the second match.   
    * Above that button, each match should be shown, with timestamps and who is on each team if pressed.   
  * Begin scout page  
    * First, the user will need to input the team number  
    * Then they will be greeted with a page with a few categories:  
      * Drivetrain  
        * With options tank, mecanum, and omni  
      * Autonomous  
        * With options reliable, inconsistent, none  
      * Endgame  
        * With options full, partial, none  
      * Reliability  
        * A simple slider out of 10\.   
      * Notes  
        * Any notes that the student wants to ad  
    * Once these have been filled out, the user can save the report, where other team members can see it.   
  * Watchlist page  
    * You can add other teams to this list and be notified when they are playing, with a notes section built in.   
      * The timings for the other teams matches will have to be manually added in however.   
  * teams page  
    * Simply a full list of the all the teams in the competition.   
    * At the bottom there will be a button to update the list of teams, with a similar layout to the schedule update but with more basic–just team number and team name.   
    * From this page, you can click on a team to view any scouting reports on them. 