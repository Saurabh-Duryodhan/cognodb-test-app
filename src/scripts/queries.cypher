// ==============================================================================
// CineGraph - openCypher Query Catalog
// Designed for CognoDB Graph Database (Bolt 5.x)
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. DATA MODEL & CONSTRAINTS
// ------------------------------------------------------------------------------
// Create uniqueness constraints for nodes
CREATE CONSTRAINT movie_title_unique IF NOT EXISTS FOR (m:Movie) REQUIRE m.title IS UNIQUE;
CREATE CONSTRAINT person_name_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE;
CREATE CONSTRAINT genre_name_unique IF NOT EXISTS FOR (g:Genre) REQUIRE g.name IS UNIQUE;
CREATE CONSTRAINT user_name_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE;

// ------------------------------------------------------------------------------
// 2. MULTI-HOP TRAVERSAL: Shortest Path / "Degrees of Separation"
// Finds the shortest connection path between two actors via co-starring or directing
// Relational (SQL) counterpart: Requires multiple recursive CTE self-joins or breadth-first iterative queries.
// ------------------------------------------------------------------------------
MATCH (p1:Person {name: $person1}), (p2:Person {name: $person2})
MATCH path = shortestPath((p1)-[:ACTED_IN|DIRECTED*..12]-(p2))
RETURN path, length(path) AS degree;

// ------------------------------------------------------------------------------
// 3. MULTI-HOP TRAVERSAL: Graph-Based Recommendation Engine
// Traverses shared actors (3pts), shared directors (4pts), and shared genres (2pts)
// ------------------------------------------------------------------------------
MATCH (m:Movie {title: $title})
// 2-hop traversal via actors
OPTIONAL MATCH (m)<-[:ACTED_IN]-(a:Person)-[:ACTED_IN]->(recA:Movie)
WHERE recA <> m
// 2-hop traversal via directors
OPTIONAL MATCH (m)<-[:DIRECTED]-(d:Person)-[:DIRECTED]->(recD:Movie)
WHERE recD <> m
// 2-hop traversal via genres
OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)<-[:IN_GENRE]-(recG:Movie)
WHERE recG <> m
WITH coalesce(recA, recD, recG) AS rec,
     count(DISTINCT a) AS sharedActorCount,
     collect(DISTINCT a.name) AS sharedActors,
     count(DISTINCT d) AS sharedDirectorCount,
     collect(DISTINCT d.name) AS sharedDirectors,
     count(DISTINCT g) AS sharedGenreCount,
     collect(DISTINCT g.name) AS sharedGenres
WHERE rec IS NOT NULL
WITH rec,
     (sharedActorCount * 3 + sharedDirectorCount * 4 + sharedGenreCount * 2) AS relevanceScore,
     sharedActors, sharedDirectors, sharedGenres
RETURN rec.title AS title, rec.released AS released, rec.imdbRating AS imdbRating,
       relevanceScore, sharedActors, sharedDirectors, sharedGenres
ORDER BY relevanceScore DESC, rec.imdbRating DESC
LIMIT 6;

// ------------------------------------------------------------------------------
// 4. COMPLEX GRAPH QUERY: Frequent Co-Star Collaborations (Multi-Hop)
// Identifies frequent co-star partnerships who have starred in multiple films together
// ------------------------------------------------------------------------------
MATCH (p1:Person)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(p2:Person)
WHERE id(p1) < id(p2)
WITH p1, p2, count(m) AS sharedMoviesCount, collect(m.title) AS movieTitles
WHERE sharedMoviesCount >= 2
RETURN p1.name AS actor1, p2.name AS actor2, sharedMoviesCount, movieTitles
ORDER BY sharedMoviesCount DESC;

// ------------------------------------------------------------------------------
// 5. CRUD: Create / Merge Movie with Multi-Type Relationships
// ------------------------------------------------------------------------------
MERGE (m:Movie {title: $title})
ON CREATE SET 
  m.released = $released,
  m.tagline = $tagline,
  m.poster = $poster,
  m.imdbRating = $imdbRating,
  m.overview = $overview,
  m.duration = $duration,
  m.createdAt = timestamp()
WITH m
UNWIND $directors AS directorName
MERGE (d:Person {name: directorName})
MERGE (d)-[:DIRECTED]->(m)
WITH m
UNWIND $cast AS actorItem
MERGE (a:Person {name: actorItem.name})
MERGE (a)-[r:ACTED_IN]->(m)
SET r.roles = actorItem.roles
WITH m
UNWIND $genres AS genreName
MERGE (g:Genre {name: genreName})
MERGE (m)-[:IN_GENRE]->(g)
RETURN m.title AS title;

// ------------------------------------------------------------------------------
// 6. CRUD: Safe Detach Delete Movie
// ------------------------------------------------------------------------------
MATCH (m:Movie {title: $title})
DETACH DELETE m;

// ------------------------------------------------------------------------------
// 7. USER ENGAGEMENT: Add Movie Review & Update Graph
// ------------------------------------------------------------------------------
MATCH (m:Movie {title: $title})
MERGE (u:User {username: $username})
MERGE (u)-[r:RATED]->(m)
SET r.rating = $rating,
    r.review = $review,
    r.timestamp = timestamp()
RETURN u.username, m.title, r.rating;
