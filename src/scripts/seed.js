import { getDriver, executeQuery, closeDriver } from '../config/database.js';

const MOVIES_SEED_DATA = [
  {
    title: 'The Matrix',
    released: 1999,
    tagline: 'Welcome to the Real World',
    overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    imdbRating: 8.7,
    duration: 136,
    poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=80',
    directors: ['Lana Wachowski', 'Lilly Wachowski'],
    genres: ['Sci-Fi', 'Action'],
    cast: [
      { name: 'Keanu Reeves', roles: ['Neo / Thomas Anderson'], born: 1964 },
      { name: 'Carrie-Anne Moss', roles: ['Trinity'], born: 1967 },
      { name: 'Laurence Fishburne', roles: ['Morpheus'], born: 1961 },
      { name: 'Hugo Weaving', roles: ['Agent Smith'], born: 1960 }
    ]
  },
  {
    title: 'The Matrix Reloaded',
    released: 2003,
    tagline: 'Free your mind.',
    overview: 'Neo and the rebel leaders estimate that they have 72 hours until 250,000 probes discover Zion and destroy it.',
    imdbRating: 7.2,
    duration: 138,
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    directors: ['Lana Wachowski', 'Lilly Wachowski'],
    genres: ['Sci-Fi', 'Action'],
    cast: [
      { name: 'Keanu Reeves', roles: ['Neo'], born: 1964 },
      { name: 'Carrie-Anne Moss', roles: ['Trinity'], born: 1967 },
      { name: 'Laurence Fishburne', roles: ['Morpheus'], born: 1961 },
      { name: 'Hugo Weaving', roles: ['Agent Smith'], born: 1960 },
      { name: 'Jada Pinkett Smith', roles: ['Niobe'], born: 1971 }
    ]
  },
  {
    title: 'Inception',
    released: 2010,
    tagline: 'Your mind is the scene of the crime.',
    overview: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    imdbRating: 8.8,
    duration: 148,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    directors: ['Christopher Nolan'],
    genres: ['Sci-Fi', 'Action', 'Thriller'],
    cast: [
      { name: 'Leonardo DiCaprio', roles: ['Dom Cobb'], born: 1974 },
      { name: 'Joseph Gordon-Levitt', roles: ['Arthur'], born: 1981 },
      { name: 'Elliot Page', roles: ['Ariadne'], born: 1987 },
      { name: 'Tom Hardy', roles: ['Eames'], born: 1977 },
      { name: 'Ken Watanabe', roles: ['Saito'], born: 1959 },
      { name: 'Cillian Murphy', roles: ['Robert Fischer'], born: 1976 },
      { name: 'Michael Caine', roles: ['Professor Stephen Miles'], born: 1933 }
    ]
  },
  {
    title: 'Interstellar',
    released: 2014,
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    overview: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft along with a team of researchers to find a new planet for humans.',
    imdbRating: 8.7,
    duration: 169,
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80',
    directors: ['Christopher Nolan'],
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    cast: [
      { name: 'Matthew McConaughey', roles: ['Cooper'], born: 1969 },
      { name: 'Anne Hathaway', roles: ['Dr. Amelia Brand'], born: 1982 },
      { name: 'Jessica Chastain', roles: ['Murphy Cooper (Adult)'], born: 1977 },
      { name: 'Michael Caine', roles: ['Professor John Brand'], born: 1933 },
      { name: 'Matt Damon', roles: ['Dr. Mann'], born: 1970 }
    ]
  },
  {
    title: 'The Dark Knight',
    released: 2008,
    tagline: 'Why So Serious?',
    overview: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    imdbRating: 9.0,
    duration: 152,
    poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80',
    directors: ['Christopher Nolan'],
    genres: ['Action', 'Crime', 'Drama'],
    cast: [
      { name: 'Christian Bale', roles: ['Bruce Wayne / Batman'], born: 1974 },
      { name: 'Heath Ledger', roles: ['Joker'], born: 1979 },
      { name: 'Aaron Eckhart', roles: ['Harvey Dent'], born: 1968 },
      { name: 'Michael Caine', roles: ['Alfred Pennyworth'], born: 1933 },
      { name: 'Gary Oldman', roles: ['James Gordon'], born: 1958 },
      { name: 'Morgan Freeman', roles: ['Lucius Fox'], born: 1937 },
      { name: 'Cillian Murphy', roles: ['Dr. Jonathan Crane / Scarecrow'], born: 1976 }
    ]
  },
  {
    title: 'The Dark Knight Rises',
    released: 2012,
    tagline: 'A Fire Will Rise.',
    overview: 'Eight years after the Joker\'s reign of anarchy, Batman, with the help of the enigmatic Selina Kyle, is forced from his exile to save Gotham City from the brutal guerrilla terrorist Bane.',
    imdbRating: 8.4,
    duration: 164,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    directors: ['Christopher Nolan'],
    genres: ['Action', 'Drama', 'Thriller'],
    cast: [
      { name: 'Christian Bale', roles: ['Bruce Wayne / Batman'], born: 1974 },
      { name: 'Tom Hardy', roles: ['Bane'], born: 1977 },
      { name: 'Anne Hathaway', roles: ['Selina Kyle / Catwoman'], born: 1982 },
      { name: 'Joseph Gordon-Levitt', roles: ['John Blake'], born: 1981 },
      { name: 'Gary Oldman', roles: ['James Gordon'], born: 1958 },
      { name: 'Michael Caine', roles: ['Alfred Pennyworth'], born: 1933 },
      { name: 'Morgan Freeman', roles: ['Lucius Fox'], born: 1937 }
    ]
  },
  {
    title: 'Oppenheimer',
    released: 2023,
    tagline: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    overview: 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb during World War II.',
    imdbRating: 8.9,
    duration: 180,
    poster: 'https://images.unsplash.com/photo-1579273166152-d725a4e2b755?w=500&auto=format&fit=crop&q=80',
    directors: ['Christopher Nolan'],
    genres: ['Biography', 'Drama', 'History'],
    cast: [
      { name: 'Cillian Murphy', roles: ['J. Robert Oppenheimer'], born: 1976 },
      { name: 'Emily Blunt', roles: ['Katherine "Kitty" Oppenheimer'], born: 1983 },
      { name: 'Matt Damon', roles: ['Leslie Groves'], born: 1970 },
      { name: 'Robert Downey Jr.', roles: ['Lewis Strauss'], born: 1965 },
      { name: 'Florence Pugh', roles: ['Jean Tatlock'], born: 1996 }
    ]
  },
  {
    title: 'Pulp Fiction',
    released: 1994,
    tagline: 'Just because you are a character doesn\'t mean that you have character.',
    overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    imdbRating: 8.9,
    duration: 154,
    poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=80',
    directors: ['Quentin Tarantino'],
    genres: ['Crime', 'Drama'],
    cast: [
      { name: 'John Travolta', roles: ['Vincent Vega'], born: 1954 },
      { name: 'Samuel L. Jackson', roles: ['Jules Winnfield'], born: 1948 },
      { name: 'Uma Thurman', roles: ['Mia Wallace'], born: 1970 },
      { name: 'Bruce Willis', roles: ['Butch Coolidge'], born: 1955 },
      { name: 'Harvey Keitel', roles: ['Winston Wolfe'], born: 1939 }
    ]
  },
  {
    title: 'Django Unchained',
    released: 2012,
    tagline: 'Life, liberty and the pursuit of vengeance.',
    overview: 'With the help of a German bounty-hunter, a freed slave sets out to rescue his wife from a brutal Mississippi plantation owner.',
    imdbRating: 8.5,
    duration: 165,
    poster: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=500&auto=format&fit=crop&q=80',
    directors: ['Quentin Tarantino'],
    genres: ['Western', 'Drama', 'Action'],
    cast: [
      { name: 'Jamie Foxx', roles: ['Django Freeman'], born: 1967 },
      { name: 'Christoph Waltz', roles: ['Dr. King Schultz'], born: 1956 },
      { name: 'Leonardo DiCaprio', roles: ['Calvin J. Candie'], born: 1974 },
      { name: 'Kerry Washington', roles: ['Broomhilda von Shaft'], born: 1977 },
      { name: 'Samuel L. Jackson', roles: ['Stephen'], born: 1948 }
    ]
  },
  {
    title: 'The Shawshank Redemption',
    released: 1994,
    tagline: 'Fear can hold you prisoner. Hope can set you free.',
    overview: 'Over the course of several years, two convicts form a friendship, seeking solace and, eventually, redemption through basic compassion.',
    imdbRating: 9.3,
    duration: 142,
    poster: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=80',
    directors: ['Frank Darabont'],
    genres: ['Drama'],
    cast: [
      { name: 'Tim Robbins', roles: ['Andy Dufresne'], born: 1958 },
      { name: 'Morgan Freeman', roles: ['Ellis Boyd "Red" Redding'], born: 1937 },
      { name: 'Bob Gunton', roles: ['Warden Samuel Norton'], born: 1945 }
    ]
  },
  {
    title: 'Forrest Gump',
    released: 1994,
    tagline: 'The world will never be the same once you\'ve seen it through the eyes of Forrest Gump.',
    overview: 'The history of the United States from the 1950s to the \'70s unfolds from the perspective of an Alabama man with an IQ of 75.',
    imdbRating: 8.8,
    duration: 142,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80',
    directors: ['Robert Zemeckis'],
    genres: ['Drama', 'Romance'],
    cast: [
      { name: 'Tom Hanks', roles: ['Forrest Gump'], born: 1956 },
      { name: 'Robin Wright', roles: ['Jenny Curran'], born: 1966 },
      { name: 'Gary Sinise', roles: ['Lieutenant Dan Taylor'], born: 1955 }
    ]
  },
  {
    title: 'Fight Club',
    released: 1999,
    tagline: 'Mischief. Mayhem. Soap.',
    overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.',
    imdbRating: 8.8,
    duration: 139,
    poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80',
    directors: ['David Fincher'],
    genres: ['Drama', 'Thriller'],
    cast: [
      { name: 'Brad Pitt', roles: ['Tyler Durden'], born: 1963 },
      { name: 'Edward Norton', roles: ['The Narrator'], born: 1969 },
      { name: 'Helena Bonham Carter', roles: ['Marla Singer'], born: 1966 }
    ]
  },
  {
    title: 'Se7en',
    released: 1995,
    tagline: 'Seven deadly sins. Seven ways to die.',
    overview: 'Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motives.',
    imdbRating: 8.6,
    duration: 127,
    poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&auto=format&fit=crop&q=80',
    directors: ['David Fincher'],
    genres: ['Crime', 'Drama', 'Mystery'],
    cast: [
      { name: 'Brad Pitt', roles: ['Detective David Mills'], born: 1963 },
      { name: 'Morgan Freeman', roles: ['Detective William Somerset'], born: 1937 },
      { name: 'Gwyneth Paltrow', roles: ['Tracy Mills'], born: 1972 },
      { name: 'Kevin Spacey', roles: ['John Doe'], born: 1959 }
    ]
  },
  {
    title: 'Once Upon a Time in Hollywood',
    released: 2019,
    tagline: 'In this town, it can all change... like that.',
    overview: 'A faded television actor and his stunt double strive to achieve fame and success in the final years of Hollywood\'s Golden Age in 1969 Los Angeles.',
    imdbRating: 7.6,
    duration: 161,
    poster: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=500&auto=format&fit=crop&q=80',
    directors: ['Quentin Tarantino'],
    genres: ['Comedy', 'Drama'],
    cast: [
      { name: 'Leonardo DiCaprio', roles: ['Rick Dalton'], born: 1974 },
      { name: 'Brad Pitt', roles: ['Cliff Booth'], born: 1963 },
      { name: 'Margot Robbie', roles: ['Sharon Tate'], born: 1990 },
      { name: 'Emile Hirsch', roles: ['Jay Sebring'], born: 1985 }
    ]
  },
  {
    title: 'The Wolf of Wall Street',
    released: 2013,
    tagline: 'EARN. SPEND. PARTY.',
    overview: 'Based on the true story of Jordan Belfort, from his rise to a wealthy stock-broker living the high life to his fall involving crime and corruption.',
    imdbRating: 8.2,
    duration: 180,
    poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&auto=format&fit=crop&q=80',
    directors: ['Martin Scorsese'],
    genres: ['Biography', 'Comedy', 'Crime'],
    cast: [
      { name: 'Leonardo DiCaprio', roles: ['Jordan Belfort'], born: 1974 },
      { name: 'Jonah Hill', roles: ['Donnie Azoff'], born: 1983 },
      { name: 'Margot Robbie', roles: ['Naomi Lapaglia'], born: 1990 },
      { name: 'Matthew McConaughey', roles: ['Mark Hanna'], born: 1969 }
    ]
  },
  {
    title: 'John Wick',
    released: 2014,
    tagline: 'Don\'t Set Him Off.',
    overview: 'An ex-hitman comes out of retirement to track down the gangsters that took everything from him.',
    imdbRating: 7.4,
    duration: 101,
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
    directors: ['Chad Stahelski'],
    genres: ['Action', 'Crime', 'Thriller'],
    cast: [
      { name: 'Keanu Reeves', roles: ['John Wick'], born: 1964 },
      { name: 'Michael Nyqvist', roles: ['Viggo Tarasov'], born: 1960 },
      { name: 'Willem Dafoe', roles: ['Marcus'], born: 1955 },
      { name: 'Ian McShane', roles: ['Winston'], born: 1942 }
    ]
  },
  {
    title: "The Devil's Advocate",
    released: 1997,
    tagline: 'Evil has its winning ways.',
    overview: 'An exceptionally adept Florida lawyer is offered a job at a high-end New York City law firm with a high-end boss with a secret agenda.',
    imdbRating: 7.5,
    duration: 144,
    poster: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&auto=format&fit=crop&q=80',
    directors: ['Taylor Hackford'],
    genres: ['Drama', 'Mystery', 'Thriller'],
    cast: [
      { name: 'Keanu Reeves', roles: ['Kevin Lomax'], born: 1964 },
      { name: 'Al Pacino', roles: ['John Milton'], born: 1940 },
      { name: 'Charlize Theron', roles: ['Mary Ann Lomax'], born: 1975 }
    ]
  }
];

const USER_REVIEWS = [
  { movie: 'Inception', user: 'Cinephile99', rating: 9.5, review: 'A mind-bending cinematic masterpiece with unforgettable score and acting!' },
  { movie: 'Inception', user: 'NolanFan', rating: 10.0, review: 'One of the greatest original sci-fi films ever crafted.' },
  { movie: 'The Matrix', user: 'CyberNeo', rating: 10.0, review: 'Revolutionized cinema visual effects and philosophical action storytelling.' },
  { movie: 'The Dark Knight', user: 'GothamWatcher', rating: 9.8, review: 'Heath Ledger\'s performance will go down as the gold standard of villains.' },
  { movie: 'Interstellar', user: 'AstroGeek', rating: 9.2, review: 'The emotional bond across light-years and relativity is breathtaking.' },
  { movie: 'Pulp Fiction', user: 'TarantinoBuff', rating: 9.5, review: 'Non-linear storytelling perfection with razor-sharp dialogue.' },
  { movie: 'The Shawshank Redemption', user: 'ClassicLover', rating: 10.0, review: 'Pure storytelling beauty. A masterpiece about human hope.' },
  { movie: 'Fight Club', user: 'NightOwl', rating: 9.0, review: 'A gritty and brilliant satire on consumerism and identity.' },
  { movie: 'Oppenheimer', user: 'HistoryNerd', rating: 9.1, review: 'Phenomenal pacing, tension, and sound design.' }
];

async function seedDatabase() {
  console.log('🌱 Starting CognoDB Movie Graph Seeder...');
  const startTime = Date.now();

  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    console.log('✅ Connected to CognoDB successfully.');

    // 1. Seed Movies, Cast, Directors, and Genres
    console.log(`📦 Ingesting ${MOVIES_SEED_DATA.length} iconic movies with full graph relationships...`);
    
    for (const movie of MOVIES_SEED_DATA) {
      const cypher = `
        MERGE (m:Movie {title: $title})
        SET 
          m.released = $released,
          m.tagline = $tagline,
          m.overview = $overview,
          m.imdbRating = $imdbRating,
          m.duration = $duration,
          m.poster = $poster,
          m.updatedAt = timestamp()

        // Link Directors
        WITH m
        UNWIND $directors AS dirName
        MERGE (d:Person {name: dirName})
        MERGE (d)-[:DIRECTED]->(m)

        // Link Cast
        WITH m
        UNWIND $cast AS actor
        MERGE (a:Person {name: actor.name})
        ON CREATE SET a.born = actor.born
        MERGE (a)-[r:ACTED_IN]->(m)
        SET r.roles = actor.roles

        // Link Genres
        WITH m
        UNWIND $genres AS genreName
        MERGE (g:Genre {name: genreName})
        MERGE (m)-[:IN_GENRE]->(g)
      `;

      await executeQuery(cypher, {
        title: movie.title,
        released: movie.released,
        tagline: movie.tagline,
        overview: movie.overview,
        imdbRating: movie.imdbRating,
        duration: movie.duration,
        poster: movie.poster,
        directors: movie.directors,
        cast: movie.cast,
        genres: movie.genres
      }, 'WRITE');
      console.log(`  ✓ Ingested: "${movie.title}" (${movie.released})`);
    }

    // 2. Seed User Reviews
    console.log(`⭐ Adding ${USER_REVIEWS.length} community reviews...`);
    for (const review of USER_REVIEWS) {
      const reviewCypher = `
        MATCH (m:Movie {title: $movie})
        MERGE (u:User {username: $user})
        MERGE (u)-[r:RATED]->(m)
        SET r.rating = $rating,
            r.review = $review,
            r.timestamp = timestamp()
      `;
      await executeQuery(reviewCypher, review, 'WRITE');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Seeding completed successfully in ${elapsed}s!`);

    // Print summary stats
    const statsQuery = `
      MATCH (n)
      RETURN labels(n)[0] AS label, count(n) AS count
    `;
    const stats = await executeQuery(statsQuery);
    console.log('\n📊 Graph Database Summary:');
    stats.records.forEach(r => {
      console.log(`  • [${r.label}]: ${r.count} nodes`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

seedDatabase();
