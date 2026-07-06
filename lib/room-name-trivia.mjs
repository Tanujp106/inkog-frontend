const ALIAS_TRIVIA = {
  "Dennis Ritchie": "Dennis Ritchie co-created C and helped build Unix, so a lot of modern software quietly speaks his language.",
  "Ken Thompson": "Ken Thompson helped create Unix and designed B, the language that led directly to C.",
  "Brian Kernighan": "Brian Kernighan helped define the Unix voice and co-authored the classic book on C.",
  "Douglas McIlroy": "Douglas McIlroy championed Unix pipes: tiny programs connected together like a clean command-line spell.",
  "Joseph Ossanna": "Joseph Ossanna created early Unix text-formatting tools, including the roots of troff.",
  "Lorinda Cherry": "Lorinda Cherry built influential Unix text tools and helped shape the system's writer-friendly side.",
  "Evi Nemeth": "Evi Nemeth was a legendary systems teacher and co-author of the Unix and Linux administration handbooks.",
  "Mary Ann Horton": "Mary Ann Horton worked on early Unix tools and helped bring email and Usenet systems to wider communities.",
  "Radia Perlman": "Radia Perlman invented spanning tree protocol, a quiet backbone idea behind reliable networks.",
  "Frances Allen": "Frances Allen pioneered compiler optimization and became the first woman to receive the Turing Award.",
  "Margaret Hamilton": "Margaret Hamilton led Apollo flight software work and popularized the idea of software engineering.",
  "Barbara Liskov": "Barbara Liskov shaped modern programming with data abstraction and the Liskov substitution principle.",
  "Adele Goldberg": "Adele Goldberg helped build Smalltalk, one of the big sparks behind object-oriented interfaces.",
  "Alan Kay": "Alan Kay imagined personal dynamic computing and helped create Smalltalk.",
  "Butler Lampson": "Butler Lampson helped design influential personal computing, networking, and distributed systems ideas.",
  "Dan Ingalls": "Dan Ingalls was a core Smalltalk implementer and helped make live, visual programming feel possible.",
  "Elizabeth Feinler": "Elizabeth Feinler ran the early network information center, including directories before DNS took over.",
  "Jean Bartik": "Jean Bartik was one of the original ENIAC programmers, helping define programming before it had a clear job title.",
  "Kathleen Booth": "Kathleen Booth wrote one of the earliest assembly languages and worked on early British computers.",
  "Lynn Conway": "Lynn Conway transformed chip design with VLSI methods that helped make modern processors practical.",
  "Mary Allen Wilkes": "Mary Allen Wilkes programmed the LINC and is often linked with early personal computer use at home.",
  "Sophie Wilson": "Sophie Wilson designed the BBC Micro instruction set and co-designed the original ARM architecture.",
  "Susan Kare": "Susan Kare made early Macintosh icons feel human, giving pixels a personality.",
  "Erna Schneider Hoover": "Erna Schneider Hoover invented computerized telephone switching methods that made phone networks more resilient.",
  "Jude Milhon": "Jude Milhon, known as St. Jude, helped shape early hacker culture and pushed for access and curiosity.",
  "Karen Sparck Jones": "Karen Sparck Jones pioneered information retrieval ideas behind search engines, including inverse document frequency.",
  "John Backus": "John Backus led the creation of Fortran and introduced Backus-Naur Form for describing programming languages.",
  "Niklaus Wirth": "Niklaus Wirth created Pascal and championed clear, disciplined language design.",
  "Gary Kildall": "Gary Kildall created CP/M, a key operating system in the early personal computer era.",
  "Fernando Corbato": "Fernando Corbato led time-sharing systems work and helped make interactive computing feel normal.",
  "Jef Raskin": "Jef Raskin started the Macintosh project and cared deeply about humane interfaces.",
  "Whitfield Diffie": "Whitfield Diffie helped introduce public-key cryptography, changing how secure communication works.",
  "Martin Hellman": "Martin Hellman co-created public-key exchange ideas that still protect digital communication.",
  "Leslie Lamport": "Leslie Lamport shaped distributed systems theory and created LaTeX.",
  "Evelyn Boyd Granville": "Evelyn Boyd Granville was a pioneering mathematician and programmer who worked on early spaceflight calculations.",
  "Thelma Estrin": "Thelma Estrin advanced biomedical computing and helped connect engineering with medicine.",
};

function normalizeAlias(alias) {
  return alias.trim().replace(/\s+\d+$/, "");
}

export function getRoomNameTrivia(alias) {
  const normalized = normalizeAlias(alias);
  return ALIAS_TRIVIA[normalized] ?? `${normalized} is part of Inkog's computing-history alias set: a small nod to the people who made terminals, networks, and software culture feel alive.`;
}
