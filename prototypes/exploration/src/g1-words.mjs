// G1, the watch in one place (plan v6 3a; W3's and W4's rules in the test place only). Every line is [copy]: placeholders say the meaning only, in the page's words for the habits.
// The model's own words, in their own file: the page's words.mjs holds only the day table the model reads (DAY, partOfDay).
export const G1 = {
  title: 'The watch · test place',
  ease: ['grazing', 'ears up', 'watching', 'gone'],   // [copy] her four stages, said under her
  gone: 'She has gone from here for the day',   // [copy] gone ends her day in this place
  hear: (creep, walk) => 'creep ' + (creep ? 'heard' : 'unheard') + ' · walk ' + (walk ? 'heard' : 'unheard'),   // [copy] the line under her: whether the next step would be heard
  hearNone: 'she is not in sight',   // [copy]
  heardStep: 'She heard that · her ears go up',   // [copy]
  settled: 'She settles again',   // [copy]
  hold: { ten: 'Kept still · ten light gone', ease: 'Kept still · her ease changed', tell: 'Kept still · something is starting', weather: 'Kept still · the weather turned', part: 'Kept still · the day turned', over: 'Kept still · the day ends' },   // [copy] why a hold ended
  lost: 'She stopped · the habit is lost for today',   // [copy] a heard step in a habit sends it away
  habit: {
    shake: { name: 'shake-dry', tell: 'A shiver starts at her head', beats: ['the shiver runs back along her', 'fur flies', 'she trots on', 'a tuft is left where she stood'] },   // [copy] canon beats
    calm: { name: 'calm', tell: 'She stops, ears up, and turns her head to a wary one', beats: ['she stops and looks', 'she sits a little lower', 'its startle drops', 'it comes closer'] },
    sleep: { name: 'sleep-curled', tell: 'She walks a small circle', beats: ['the circle', 'she folds her legs', 'her nose goes under her tail', 'her breathing slows'] },
  },
  // what a note shows at each range (editorial's table; far gives a shape, mid the name, near the beats and what is left)
  seen: {
    shake: { far: 'a shiver, a small grey shape', mid: 'the fur flies · a shake', near: 'all four beats · a tuft left behind' },
    calm: { far: 'she has stopped', mid: 'she has turned to a wary one · calm', near: 'all four beats · the wary one’s face' },
    sleep: { far: 'a round shape low in the grass', mid: 'the circle · she is bedding down', near: 'all four beats · the breathing' },
  },
  // (range rule) what a note gives by range: far where she goes (clear air), mid the coat (and where she goes in dim air), near her face; all [copy] placeholders
  give: {
    shake: { place: 'she trots on, toward the reeds', coat: 'the fur flies · her coat, whole', face: 'all four beats · a tuft left behind', shape: 'a shiver, a small grey shape' },
    calm: { place: 'the wary one goes off along the sand', coat: 'she has turned to a wary one · her coat, whole', face: 'all four beats · the wary one’s face', shape: 'she has stopped' },
    sleep: { place: 'her bed, in the grass', coat: 'the circle · her coat, whole', face: 'all four beats · the breathing', shape: 'a round shape low in the grass' },
  },
  want: { place: 'where she goes', coat: 'her coat', face: 'her face' },   // [copy] what the card still lacks for a habit
  card: (name, want, filled) => name + ' · ' + (filled ? 'learned: ' : 'still to learn: ') + want,   // [copy] one card line per habit
  stay: n => 'stay ' + n,   // [copy] the number at the ring's edge: light she lets you stay within 2 tiles
  note: (range, text) => 'Noted · ' + range + ' · ' + text,   // [copy]
  noteDup: 'Already noted from this range',   // [copy]
  noteNo: { habit: 'Nothing to note yet', face: 'Face her to note', sight: 'Something is in the way', gone: 'She is gone' },   // [copy]
  data: n => '+' + n + ' Data',
  sample: { shake: 'a tuft', calm: 'a whisker', sleep: 'a shed claw' },   // [copy] the sample at near range; the tuft is the shake's keepsake (canon); whisker and claw are the builder's pick
  forecast: (rain, mibi) => (rain ? 'rain ' + rain[0] + ' to ' + rain[1] : 'dry') + ' · wary one: ' + mibi + ' · dusk',   // [copy] the day's forecast, in light and parts
  keys: '↑↓←→ step · ✓ note or still · C wait · ⌫ face her',   // [copy]
};
