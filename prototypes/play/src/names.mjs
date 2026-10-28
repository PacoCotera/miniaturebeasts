// The mibi name lists, one home for both devices: the Station (station/src/state.mjs) and the Companion (exploration/index.html) read the current list from here.
// Pure data, no imports, so the standalone Companion page can load it over HTTP as it loads ../play/src/footer.mjs.
// es-pets-1 (owner 2026-10-27): names common for pets in Mexico, the owner's own pets first (sources: DogHero Pet Censo 2020, CuidaMiMascota 2023, classic Mexican pet names). The app stays in English; the Spanish names are a deliberate contrast.
// en-short-1: the twelve English names, ARCHIVED 2026-10-27; kept so tests, fixtures and goldens that show them pin them by injecting the pool.
export const NAME_LISTS = {
  "es-pets-1": [
    "Tita", "Kenya", "Simba", "Nina", "Arya", "Wero", "Jax", "Totopo", "Churro", "Luna", "Solovino", "Lucky", "Max", "Michi", "Charlie", "Lola",
    "Minino", "Daisy", "Bruno", "Misifú", "Bella", "Maya", "Micifuz", "Lucy", "Jack", "Chispa", "Sasha", "Nala", "Pecas", "Chester", "Toby", "Bigotes",
    "Bobby", "Kira", "Manchas", "Rex", "Rocky", "Pinto", "Duke", "Mila", "Copito", "Oliver", "Zeus", "Peluche", "Leo", "Camila", "Motita", "Jake",
    "Milo", "Bolita", "Buddy", "Molly", "Pompón", "Chloe", "Lucas", "Chiquita", "Lily", "Mía", "Nena", "Cleo", "Loki", "Peque", "Kitty", "Coco",
    "Reina", "Peggy", "Frida", "Duquesa", "Penny", "Kika", "Duque", "Rosie", "Mina", "Pirata", "Ruby", "Misha", "Bandido", "Ginger", "Titán", "Lupe",
    "Pepper", "Tomás", "Chela", "Cookie", "Tom", "Nacho", "Muffin", "Benito", "Pepe", "Cupcake", "Chimuelo", "Toño", "Bonnie", "Pelusa", "Beto",
    "Bingo", "Boris", "Lalo", "Rocco", "Cuco", "Memo", "Odín", "Cucho", "Chucho", "Apolo", "Juana", "Fermín", "Atenea", "Taquito", "Bartolo", "Hera",
    "Mostro", "Simón", "Cleopatra", "Metzli", "Teo", "Hachi", "Princesa", "Matías", "Tofu", "Rufo", "Tito", "Sushi", "Thor", "Kiko", "Wasabi", "Sansa",
    "Gaspar", "Mochi", "Ragnar", "Homero", "Pixie", "Brownie", "Romeo", "Kiwi", "Oreo", "Julieta", "Ozzy", "Nugget", "Frijol", "Kaiser", "Pay",
    "Elote", "Kenzo", "Pancho", "Tamal", "Akira", "Canela", "Cajeta", "Gaia", "Firulais", "Concha", "Abril", "Luke", "Mazapán", "Emma", "Roco",
    "Chicle", "Sofía", "Capo", "Gomita", "Valentina", "Kiara", "Galleta", "Lulú", "Luca", "Chocolate", "Fifí", "Bombón", "Mimí", "Dona", "Trufa",
    "Panqué", "Pretzel", "Mango", "Waffle", "Miel", "Bambú", "Sol", "Dante", "Rayo", "Iker", "Canica", "Thiago", "Cosita", "Salem", "Chato", "Lía",
    "Flaco", "Nube", "Cuquis", "Bimba", "Pelón", "Hércules", "Chamaco", "Sombra", "Travieso", "Fiona", "Lucero", "Lilo", "Estrella", "Rambo", "Kuki",
    "Shaggy", "Chabela", "Benji", "Rosita", "Bobi", "Margarita", "Pupi", "Violeta", "Tuti", "Rocío", "Momo", "Cielo", "Mishi", "Jazmín", "Pelos",
    "Rufina", "Tomasa", "Tencha", "Licha", "Chona", "Cata", "Pachita", "Chepa", "Tere", "Lencho", "Goyo", "Chayo", "Chente", "Chuy", "Pina", "Polo",
    "Lucha", "Quique", "Fito", "Chava", "Paquita", "Rufino", "Cuca", "Tota", "Toto", "Kuka", "Chilo", "Pinky", "Trapito", "Greñas", "Chiflas", "Botas",
    "Calcetas", "Sabina", "Lupita", "Chamoy", "Tamarindo", "Pistache",
  ],
  "en-short-1": ["Dot", "Moss", "Bean", "Fig", "Nib", "Tuft", "Pebble", "Wren", "Pip", "Sorrel", "Burr", "Quill"],
};
export const NAME_LIST_CURRENT = "es-pets-1";
export const NAME_LIST_ARCHIVED = { "en-short-1": "2026-10-27" };
export const MIBI_NAMES = NAME_LISTS[NAME_LIST_CURRENT];
export const MIBI_NAMES_ARCHIVED = NAME_LISTS["en-short-1"];
