import { executeQuery } from '../config/database.js';

export const MovieService = {
  /**
   * Get database statistics (node counts, relationship counts, labels, etc.)
   */
  async getDatabaseStats() {
    const cypher = `
      MATCH (n)
      OPTIONAL MATCH ()-[r]->()
      RETURN 
        count(DISTINCT n) AS totalNodes,
        count(DISTINCT r) AS totalRelationships
    `;
    const labelCypher = `
      MATCH (n)
      RETURN labels(n)[0] AS label, count(n) AS count
      ORDER BY count DESC
    `;
    const relCypher = `
      MATCH ()-[r]->()
      RETURN type(r) AS type, count(r) AS count
      ORDER BY count DESC
    `;

    const [general, labelsRes, relsRes] = await Promise.all([
      executeQuery(cypher),
      executeQuery(labelCypher),
      executeQuery(relCypher)
    ]);

    return {
      totalNodes: general.records[0]?.totalNodes || 0,
      totalRelationships: general.records[0]?.totalRelationships || 0,
      labels: labelsRes.records,
      relationships: relsRes.records,
      querySummary: general.summary
    };
  },

  /**
   * Get all movies with optional search, genre filtering, and pagination
   */
  async getMovies({ search = '', genre = '', yearMin, yearMax, limit = 50, skip = 0 } = {}) {
    const params = {
      search: search ? search.trim() : '',
      genre: genre ? genre.trim() : '',
      yearMin: (yearMin !== undefined && yearMin !== '') ? Number(yearMin) : null,
      yearMax: (yearMax !== undefined && yearMax !== '') ? Number(yearMax) : null,
      limit: Number(limit),
      skip: Number(skip)
    };

    const cypher = `
      MATCH (m:Movie)
      OPTIONAL MATCH (m)<-[:DIRECTED]-(d:Person)
      OPTIONAL MATCH (m)<-[act:ACTED_IN]-(a:Person)
      OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)
      OPTIONAL MATCH (u:User)-[r:RATED]->(m)
      WITH m, d, a, g, r, act
      WHERE (
        $search = '' OR
        toLower(coalesce(m.title, '')) CONTAINS toLower($search) OR
        toLower(coalesce(m.tagline, '')) CONTAINS toLower($search) OR
        toLower(coalesce(a.name, '')) CONTAINS toLower($search) OR
        toLower(coalesce(d.name, '')) CONTAINS toLower($search) OR
        toLower(coalesce(g.name, '')) CONTAINS toLower($search)
      )
      AND ($genre = '' OR g.name = $genre)
      AND ($yearMin IS NULL OR m.released >= $yearMin)
      AND ($yearMax IS NULL OR m.released <= $yearMax)
      WITH m, 
           [dName IN collect(DISTINCT d.name) WHERE dName IS NOT NULL] AS directors,
           [cItem IN collect(DISTINCT (CASE WHEN a.name IS NOT NULL THEN { name: a.name, roles: act.roles } ELSE null END)) WHERE cItem IS NOT NULL][0..6] AS cast,
           [gName IN collect(DISTINCT g.name) WHERE gName IS NOT NULL] AS genres,
           avg(r.rating) AS userRating,
           count(r) AS reviewCount
      RETURN {
        id: id(m),
        title: m.title,
        released: m.released,
        tagline: m.tagline,
        poster: m.poster,
        imdbRating: m.imdbRating,
        overview: m.overview,
        duration: m.duration,
        directors: directors,
        cast: cast,
        genres: genres,
        userRating: CASE WHEN userRating IS NOT NULL THEN round(userRating * 10) / 10.0 ELSE null END,
        reviewCount: reviewCount
      } AS movie
      ORDER BY coalesce(m.released, 0) DESC, m.title ASC
      SKIP $skip
      LIMIT $limit
    `;

    const result = await executeQuery(cypher, params);
    return {
      movies: result.records.map(r => r.movie),
      summary: result.summary
    };
  },

  /**
   * Get single movie by exact title with full graph connections & reviews
   */
  async getMovieByTitle(title) {
    const cypher = `
      MATCH (m:Movie {title: $title})
      OPTIONAL MATCH (m)<-[:DIRECTED]-(d:Person)
      OPTIONAL MATCH (m)<-[act:ACTED_IN]-(a:Person)
      OPTIONAL MATCH (m)<-[:PRODUCED]-(prod:Person)
      OPTIONAL MATCH (m)<-[:WROTE]-(w:Person)
      OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)
      OPTIONAL MATCH (u:User)-[r:RATED]->(m)
      WITH m, 
           [dItem IN collect(DISTINCT (CASE WHEN d.name IS NOT NULL THEN { name: d.name, born: d.born, bio: d.bio, image: d.image } ELSE null END)) WHERE dItem IS NOT NULL] AS directors,
           [cItem IN collect(DISTINCT (CASE WHEN a.name IS NOT NULL THEN { name: a.name, born: a.born, image: a.image, roles: act.roles } ELSE null END)) WHERE cItem IS NOT NULL] AS cast,
           [pName IN collect(DISTINCT prod.name) WHERE pName IS NOT NULL] AS producers,
           [wName IN collect(DISTINCT w.name) WHERE wName IS NOT NULL] AS writers,
           [gName IN collect(DISTINCT g.name) WHERE gName IS NOT NULL] AS genres,
           [rev IN collect(DISTINCT (CASE WHEN u.username IS NOT NULL THEN { username: u.username, rating: r.rating, review: r.review, timestamp: r.timestamp } ELSE null END)) WHERE rev IS NOT NULL] AS reviews,
           avg(r.rating) AS avgUserRating
      RETURN {
        id: id(m),
        title: m.title,
        released: m.released,
        tagline: m.tagline,
        poster: m.poster,
        imdbRating: m.imdbRating,
        overview: m.overview,
        duration: m.duration,
        budget: m.budget,
        revenue: m.revenue,
        directors: directors,
        cast: cast,
        producers: producers,
        writers: writers,
        genres: genres,
        reviews: reviews,
        avgUserRating: CASE WHEN avgUserRating IS NOT NULL THEN round(avgUserRating * 10) / 10.0 ELSE null END
      } AS movie
    `;

    const result = await executeQuery(cypher, { title });
    if (result.records.length === 0) return null;
    return {
      movie: result.records[0].movie,
      summary: result.summary
    };
  },

  /**
   * Create a new Movie node and link relationships to Director, Actors, and Genres
   */
  async createMovie(data) {
    const {
      title,
      released,
      tagline = '',
      poster = '',
      imdbRating = 7.5,
      overview = '',
      duration = 120,
      directors = [],
      cast = [], // array of { name: '...', roles: ['...'] }
      genres = []
    } = data;

    const cypher = `
      MERGE (m:Movie {title: $title})
      ON CREATE SET 
        m.released = $released,
        m.tagline = $tagline,
        m.poster = $poster,
        m.imdbRating = $imdbRating,
        m.overview = $overview,
        m.duration = $duration,
        m.createdAt = timestamp()
      ON MATCH SET
        m.released = $released,
        m.tagline = $tagline,
        m.poster = $poster,
        m.imdbRating = $imdbRating,
        m.overview = $overview,
        m.duration = $duration,
        m.updatedAt = timestamp()

      // Link Directors
      WITH m
      UNWIND (CASE WHEN size($directors) > 0 THEN $directors ELSE [null] END) AS directorName
      FOREACH (_ IN CASE WHEN directorName IS NOT NULL THEN [1] ELSE [] END |
        MERGE (d:Person {name: directorName})
        MERGE (d)-[:DIRECTED]->(m)
      )

      // Link Cast
      WITH m
      UNWIND (CASE WHEN size($cast) > 0 THEN $cast ELSE [null] END) AS actorItem
      FOREACH (_ IN CASE WHEN actorItem IS NOT NULL AND actorItem.name IS NOT NULL THEN [1] ELSE [] END |
        MERGE (a:Person {name: actorItem.name})
        MERGE (a)-[r:ACTED_IN]->(m)
        SET r.roles = coalesce(actorItem.roles, ['Cast'])
      )

      // Link Genres
      WITH m
      UNWIND (CASE WHEN size($genres) > 0 THEN $genres ELSE [null] END) AS genreName
      FOREACH (_ IN CASE WHEN genreName IS NOT NULL THEN [1] ELSE [] END |
        MERGE (g:Genre {name: genreName})
        MERGE (m)-[:IN_GENRE]->(g)
      )

      RETURN m.title AS title
    `;

    const params = {
      title: title.trim(),
      released: released ? Number(released) : new Date().getFullYear(),
      tagline,
      poster,
      imdbRating: Number(imdbRating) || 7.0,
      overview,
      duration: Number(duration) || 120,
      directors: Array.isArray(directors) ? directors.filter(Boolean) : [directors].filter(Boolean),
      cast: Array.isArray(cast) ? cast : [],
      genres: Array.isArray(genres) ? genres.filter(Boolean) : [genres].filter(Boolean)
    };

    const result = await executeQuery(cypher, params, 'WRITE');
    return {
      success: true,
      title: result.records[0]?.title,
      summary: result.summary
    };
  },

  /**
   * Update an existing Movie node and refresh its relationships
   */
  async updateMovie(oldTitle, data) {
    const {
      title = oldTitle,
      released,
      tagline,
      poster,
      imdbRating,
      overview,
      duration,
      directors,
      cast,
      genres
    } = data;

    const cypher = `
      MATCH (m:Movie {title: $oldTitle})
      SET 
        m.title = $title,
        m.released = $released,
        m.tagline = $tagline,
        m.poster = $poster,
        m.imdbRating = $imdbRating,
        m.overview = $overview,
        m.duration = $duration,
        m.updatedAt = timestamp()

      // Reset existing directed, acted_in, in_genre relations for clean overwrite if provided
      WITH m
      OPTIONAL MATCH (m)<-[rDir:DIRECTED]-(:Person)
      DELETE rDir
      WITH m
      OPTIONAL MATCH (m)<-[rAct:ACTED_IN]-(:Person)
      DELETE rAct
      WITH m
      OPTIONAL MATCH (m)-[rGen:IN_GENRE]->(:Genre)
      DELETE rGen

      // Re-link Directors
      WITH m
      UNWIND (CASE WHEN size($directors) > 0 THEN $directors ELSE [null] END) AS directorName
      FOREACH (_ IN CASE WHEN directorName IS NOT NULL THEN [1] ELSE [] END |
        MERGE (d:Person {name: directorName})
        MERGE (d)-[:DIRECTED]->(m)
      )

      // Re-link Cast
      WITH m
      UNWIND (CASE WHEN size($cast) > 0 THEN $cast ELSE [null] END) AS actorItem
      FOREACH (_ IN CASE WHEN actorItem IS NOT NULL AND actorItem.name IS NOT NULL THEN [1] ELSE [] END |
        MERGE (a:Person {name: actorItem.name})
        MERGE (a)-[r:ACTED_IN]->(m)
        SET r.roles = coalesce(actorItem.roles, ['Cast'])
      )

      // Re-link Genres
      WITH m
      UNWIND (CASE WHEN size($genres) > 0 THEN $genres ELSE [null] END) AS genreName
      FOREACH (_ IN CASE WHEN genreName IS NOT NULL THEN [1] ELSE [] END |
        MERGE (g:Genre {name: genreName})
        MERGE (m)-[:IN_GENRE]->(g)
      )

      RETURN m.title AS title
    `;

    const params = {
      oldTitle,
      title: title.trim(),
      released: released ? Number(released) : 2024,
      tagline: tagline || '',
      poster: poster || '',
      imdbRating: Number(imdbRating) || 7.0,
      overview: overview || '',
      duration: Number(duration) || 120,
      directors: Array.isArray(directors) ? directors.filter(Boolean) : [],
      cast: Array.isArray(cast) ? cast : [],
      genres: Array.isArray(genres) ? genres.filter(Boolean) : []
    };

    const result = await executeQuery(cypher, params, 'WRITE');
    return {
      success: true,
      title: result.records[0]?.title,
      summary: result.summary
    };
  },

  /**
   * Delete a movie and detach all its relationships safely
   */
  async deleteMovie(title) {
    const cypher = `
      MATCH (m:Movie {title: $title})
      DETACH DELETE m
      RETURN count(m) AS deletedCount
    `;

    const result = await executeQuery(cypher, { title }, 'WRITE');
    return {
      success: true,
      deletedCount: result.records[0]?.deletedCount || 0,
      summary: result.summary
    };
  },

  /**
   * Add or update a user rating/review for a movie
   */
  async addReview(title, { username, rating, review }) {
    const cypher = `
      MATCH (m:Movie {title: $title})
      MERGE (u:User {username: $username})
      MERGE (u)-[r:RATED]->(m)
      SET r.rating = $rating,
          r.review = $review,
          r.timestamp = timestamp()
      RETURN u.username AS user, m.title AS movie, r.rating AS rating
    `;

    const result = await executeQuery(cypher, {
      title,
      username: username || 'Anonymous Critic',
      rating: Number(rating),
      review: review || ''
    }, 'WRITE');

    return {
      success: true,
      review: result.records[0],
      summary: result.summary
    };
  },

  /**
   * Multi-hop Degrees of Separation (Shortest Path between two people or movies)
   */
  async getDegreesOfSeparation(person1, person2) {
    const cypher = `
      MATCH (p1:Person {name: $person1}), (p2:Person {name: $person2})
      MATCH path = shortestPath((p1)-[:ACTED_IN|DIRECTED*..12]-(p2))
      RETURN path, length(path) AS degree, [n in nodes(path) | { labels: labels(n), name: coalesce(n.name, n.title) }] AS pathNodes
    `;

    const result = await executeQuery(cypher, { person1, person2 });
    if (result.records.length === 0) {
      return {
        found: false,
        message: `No connection path found between "${person1}" and "${person2}" within 12 hops.`,
        summary: result.summary
      };
    }

    const record = result.records[0];
    return {
      found: true,
      degree: record.degree,
      pathNodes: record.pathNodes,
      path: record.path,
      summary: result.summary
    };
  },

  /**
   * Multi-Hop Graph Recommendation Algorithm
   * Scores candidate movies based on shared actors (3pts), shared directors (4pts), and shared genres (2pts)
   */
  async getRecommendations(title, limit = 6) {
    const cypher = `
      MATCH (m:Movie {title: $title})
      // 1. Shared actors (2 hops: Movie <- ACTED_IN - Person - ACTED_IN -> Candidate)
      OPTIONAL MATCH (m)<-[:ACTED_IN]-(a:Person)-[:ACTED_IN]->(recA:Movie)
      WHERE recA <> m
      
      // 2. Shared directors (2 hops: Movie <- DIRECTED - Person - DIRECTED -> Candidate)
      OPTIONAL MATCH (m)<-[:DIRECTED]-(d:Person)-[:DIRECTED]->(recD:Movie)
      WHERE recD <> m
      
      // 3. Shared genres (2 hops: Movie - IN_GENRE -> Genre <- IN_GENRE - Candidate)
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
           sharedActors,
           sharedDirectors,
           sharedGenres
      
      RETURN {
        id: id(rec),
        title: rec.title,
        released: rec.released,
        tagline: rec.tagline,
        poster: rec.poster,
        imdbRating: rec.imdbRating,
        relevanceScore: relevanceScore,
        reasons: {
          sharedActors: sharedActors,
          sharedDirectors: sharedDirectors,
          sharedGenres: sharedGenres
        }
      } AS recommendation
      ORDER BY recommendation.relevanceScore DESC, recommendation.imdbRating DESC
      LIMIT $limit
    `;

    const result = await executeQuery(cypher, { title, limit: Number(limit) });
    return {
      recommendations: result.records.map(r => r.recommendation),
      summary: result.summary
    };
  },

  /**
   * Get frequent co-star pairs (multi-hop graph pattern)
   */
  async getTopCoStars(limit = 10) {
    const cypher = `
      MATCH (p1:Person)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(p2:Person)
      WHERE id(p1) < id(p2)
      WITH p1, p2, count(m) AS sharedMoviesCount, collect(m.title) AS movieTitles
      WHERE sharedMoviesCount >= 2
      RETURN {
        actor1: p1.name,
        actor2: p2.name,
        count: sharedMoviesCount,
        movies: movieTitles
      } AS collaboration
      ORDER BY collaboration.count DESC
      LIMIT $limit
    `;

    const result = await executeQuery(cypher, { limit: Number(limit) });
    return {
      collaborations: result.records.map(r => r.collaboration),
      summary: result.summary
    };
  },

  /**
   * Get people list (Actors & Directors)
   */
  async getPeople({ search = '', limit = 50 } = {}) {
    let whereClause = '';
    const params = { limit: Number(limit) };

    if (search) {
      whereClause = 'WHERE toLower(p.name) CONTAINS toLower($search)';
      params.search = search;
    }

    const cypher = `
      MATCH (p:Person)
      ${whereClause}
      OPTIONAL MATCH (p)-[:ACTED_IN]->(actedMovie:Movie)
      OPTIONAL MATCH (p)-[:DIRECTED]->(directedMovie:Movie)
      WITH p, 
           collect(DISTINCT actedMovie.title) AS actedIn,
           collect(DISTINCT directedMovie.title) AS directed
      RETURN {
        id: id(p),
        name: p.name,
        born: p.born,
        bio: p.bio,
        image: p.image,
        actedInCount: size(actedIn),
        directedCount: size(directed),
        topMovies: (actedIn + directed)[0..5]
      } AS person
      ORDER BY (person.actedInCount + person.directedCount) DESC, p.name ASC
      LIMIT $limit
    `;

    const result = await executeQuery(cypher, params);
    return {
      people: result.records.map(r => r.person),
      summary: result.summary
    };
  },

  /**
   * Get all distinct genres with movie counts
   */
  async getGenres() {
    const cypher = `
      MATCH (g:Genre)
      OPTIONAL MATCH (g)<-[:IN_GENRE]-(m:Movie)
      RETURN g.name AS name, count(m) AS movieCount
      ORDER BY movieCount DESC, name ASC
    `;

    const result = await executeQuery(cypher);
    return {
      genres: result.records,
      summary: result.summary
    };
  },

  /**
   * Get complete or localized graph data formatted for D3/Force-Directed Canvas visualization
   */
  async getGraphVisualizerData({ centerTitle = '', limitNodes = 120 } = {}) {
    let cypher;
    let params = { limitNodes: Number(limitNodes) };

    if (centerTitle) {
      cypher = `
        MATCH (center:Movie {title: $centerTitle})
        MATCH path = (center)-[r:ACTED_IN|DIRECTED|IN_GENRE*1..2]-(other)
        WITH nodes(path) AS pathNodes, relationships(path) AS pathRels
        UNWIND pathNodes AS n
        UNWIND pathRels AS rel
        WITH collect(DISTINCT n) AS uniqueNodes, collect(DISTINCT rel) AS uniqueRels
        RETURN uniqueNodes, uniqueRels
      `;
      params.centerTitle = centerTitle;
    } else {
      cypher = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        WITH collect(DISTINCT n)[0..$limitNodes] AS sampleNodes
        UNWIND sampleNodes AS n1
        OPTIONAL MATCH (n1)-[r]->(n2)
        WHERE n2 IN sampleNodes
        RETURN sampleNodes AS uniqueNodes, collect(DISTINCT r) AS uniqueRels
      `;
    }

    const result = await executeQuery(cypher, params);
    const row = result.records[0] || {};
    const rawNodes = row.uniqueNodes || [];
    const rawRels = row.uniqueRels || [];

    const nodes = rawNodes.map(n => {
      const label = n.labels?.[0] || 'Node';
      const name = n.properties?.title || n.properties?.name || n.properties?.username || `ID-${n.id}`;
      return {
        id: String(n.id),
        label,
        name,
        properties: n.properties || {}
      };
    });

    const nodeIds = new Set(nodes.map(n => n.id));

    const links = rawRels
      .filter(r => r && nodeIds.has(String(r.startNodeId)) && nodeIds.has(String(r.endNodeId)))
      .map(r => ({
        id: String(r.id),
        source: String(r.startNodeId),
        target: String(r.endNodeId),
        type: r.type,
        properties: r.properties || {}
      }));

    return {
      nodes,
      links,
      summary: result.summary
    };
  },

  /**
   * Execute custom read-only Cypher query from UI Query Console
   */
  async runCustomCypher(customQuery) {
    const trimmed = customQuery.trim();
    // Safety check: only allow read statements (MATCH, RETURN, CALL, WITH, UNWIND)
    const dangerousKeywords = ['CREATE', 'DELETE', 'SET', 'REMOVE', 'DROP', 'MERGE', 'DETACH'];
    const words = trimmed.toUpperCase().split(/\s+/);
    const hasWrite = words.some(w => dangerousKeywords.includes(w));

    if (hasWrite) {
      throw new Error('Write operations (CREATE, SET, MERGE, DELETE, DROP) are restricted in the interactive console for safety.');
    }

    return await executeQuery(trimmed, {}, 'READ');
  }
};
