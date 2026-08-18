/**
 * Interactive Smooth Force-Directed Canvas Graph Visualizer
 * Features: Alpha Cooling (no jitter/rapid shaking), Clustered Layout, Zoom, Pan, Dragging
 */
export class GraphVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.nodes = [];
    this.links = [];
    this.nodeMap = new Map();
    this.savedPositions = new Map();
    
    // Camera & Transform
    this.scale = 0.85;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDraggingCanvas = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    
    // Interaction
    this.draggedNode = null;
    this.hoveredNode = null;
    
    // Simulation / Alpha Cooling parameters
    this.alpha = 1.0;
    this.alphaMin = 0.002;
    this.alphaDecay = 0.025; // Smooth settle
    this.repulsion = 800;
    this.springLength = 110;
    this.springK = 0.04;
    this.damping = 0.75;
    this.maxSpeed = 8;
    
    // Apple Human Interface System Color Map
    this.colorMap = {
      Movie: '#2997ff',
      Person: '#bf5af2',
      Genre: '#ff9f0a',
      User: '#30d158',
      Default: '#8e8e93'
    };

    this.initCanvasSize();
    this.bindEvents();
    this.animate();
  }

  initCanvasSize() {
    const parent = this.canvas.parentElement;
    this.width = parent.clientWidth || 800;
    this.height = parent.clientHeight || 600;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    if (this.offsetX === 0 && this.offsetY === 0) {
      this.offsetX = this.width / 2;
      this.offsetY = this.height / 2;
    }
  }

  setData(nodesData, linksData) {
    this.nodeMap.clear();

    const totalNodes = nodesData.length;
    this.nodes = nodesData.map((n, i) => {
      let x, y;
      
      if (this.savedPositions.has(n.id)) {
        const saved = this.savedPositions.get(n.id);
        x = saved.x;
        y = saved.y;
      } else {
        // Initial organized concentric ring placement based on label
        const angle = (i / totalNodes) * Math.PI * 2;
        let ringRadius = 180;
        if (n.label === 'Movie') ringRadius = 120;
        else if (n.label === 'Person') ringRadius = 240;
        else if (n.label === 'Genre') ringRadius = 340;
        else if (n.label === 'User') ringRadius = 400;

        x = Math.cos(angle) * (ringRadius + (Math.sin(i * 3) * 30));
        y = Math.sin(angle) * (ringRadius + (Math.cos(i * 3) * 30));
        this.savedPositions.set(n.id, { x, y });
      }
      
      const node = {
        ...n,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: n.label === 'Movie' ? 18 : n.label === 'Person' ? 14 : 12,
        color: this.colorMap[n.label] || this.colorMap.Default
      };
      this.nodeMap.set(n.id, node);
      return node;
    });

    this.links = linksData
      .map(l => {
        const source = this.nodeMap.get(String(l.source));
        const target = this.nodeMap.get(String(l.target));
        if (!source || !target) return null;
        return {
          ...l,
          sourceNode: source,
          targetNode: target
        };
      })
      .filter(Boolean);

    // Warm up simulation gently
    this.alpha = 0.8;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.initCanvasSize());

    // Mouse Move
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.isDraggingCanvas) {
        this.offsetX += mouseX - this.dragStartX;
        this.offsetY += mouseY - this.dragStartY;
        this.dragStartX = mouseX;
        this.dragStartY = mouseY;
        return;
      }

      const worldPos = this.screenToWorld(mouseX, mouseY);

      if (this.draggedNode) {
        this.draggedNode.x = worldPos.x;
        this.draggedNode.y = worldPos.y;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
        this.savedPositions.set(this.draggedNode.id, { x: worldPos.x, y: worldPos.y });
        this.alpha = Math.max(this.alpha, 0.2); // Re-warm slightly
        return;
      }

      // Check Hover
      this.hoveredNode = null;
      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const n = this.nodes[i];
        const dist = Math.hypot(n.x - worldPos.x, n.y - worldPos.y);
        if (dist <= n.radius + 6) {
          this.hoveredNode = n;
          break;
        }
      }
      this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'grab';
    });

    // Mouse Down
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.hoveredNode) {
        this.draggedNode = this.hoveredNode;
      } else {
        this.isDraggingCanvas = true;
        this.dragStartX = mouseX;
        this.dragStartY = mouseY;
      }
    });

    // Mouse Up
    window.addEventListener('mouseup', () => {
      this.draggedNode = null;
      this.isDraggingCanvas = false;
    });

    // Zoom (Wheel)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = Math.min(Math.max(0.2, this.scale * zoomFactor), 3.5);

      this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
      this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
      this.scale = newScale;
    }, { passive: false });

    // Click Node Callback
    this.canvas.addEventListener('click', () => {
      if (this.hoveredNode && window.onGraphNodeClick) {
        window.onGraphNodeClick(this.hoveredNode);
      }
    });
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale
    };
  }

  updatePhysics() {
    if (this.alpha < this.alphaMin && !this.draggedNode) return;

    const numNodes = this.nodes.length;
    if (numNodes === 0) return;

    const currentAlpha = Math.max(this.alpha, 0.05);

    // 1. Repulsion between nodes
    for (let i = 0; i < numNodes; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < numNodes; j++) {
        const n2 = this.nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);
        
        if (dist < 320) {
          const force = (this.repulsion / distSq) * currentAlpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // 2. Spring attraction along links
    for (const link of this.links) {
      const n1 = link.sourceNode;
      const n2 = link.targetNode;
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const force = (dist - this.springLength) * this.springK * currentAlpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      n1.vx += fx;
      n1.vy += fy;
      n2.vx -= fx;
      n2.vy -= fy;
    }

    // 3. Center gravity, speed clamping & position update
    for (const node of this.nodes) {
      if (node === this.draggedNode) continue;
      
      // Gentle center gravity
      node.vx -= node.x * 0.0015 * currentAlpha;
      node.vy -= node.y * 0.0015 * currentAlpha;

      node.vx *= this.damping;
      node.vy *= this.damping;

      // Speed clamp
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > this.maxSpeed) {
        node.vx = (node.vx / speed) * this.maxSpeed;
        node.vy = (node.vy / speed) * this.maxSpeed;
      }

      node.x += node.vx;
      node.y += node.vy;

      this.savedPositions.set(node.id, { x: node.x, y: node.y });
    }

    // Cool down simulation smoothly
    this.alpha += (0 - this.alpha) * this.alphaDecay;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    // Draw Links
    for (const link of this.links) {
      const s = link.sourceNode;
      const t = link.targetNode;
      const isHighlighted = this.hoveredNode && (s === this.hoveredNode || t === this.hoveredNode);

      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.lineTo(t.x, t.y);
      this.ctx.strokeStyle = isHighlighted ? 'rgba(0, 242, 254, 0.85)' : 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = isHighlighted ? 2.2 : 1.0;
      this.ctx.stroke();

      // Relationship text
      if (isHighlighted || this.scale > 1.25) {
        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;
        this.ctx.fillStyle = isHighlighted ? '#2997ff' : 'rgba(161, 161, 166, 0.7)';
        this.ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(link.type, midX, midY - 4);
      }
    }

    // Draw Nodes
    for (const node of this.nodes) {
      const isHovered = node === this.hoveredNode;
      const isConnected = this.hoveredNode && this.links.some(l => 
        (l.sourceNode === this.hoveredNode && l.targetNode === node) ||
        (l.targetNode === this.hoveredNode && l.sourceNode === node)
      );

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      if (isHovered || isConnected) {
        this.ctx.shadowColor = node.color;
        this.ctx.shadowBlur = 18;
      }

      this.ctx.fillStyle = node.color;
      this.ctx.fill();

      this.ctx.lineWidth = isHovered ? 2.5 : 1.2;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.stroke();
      this.ctx.restore();

      // Node Name Label
      this.ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(245, 245, 247, 0.92)';
      this.ctx.font = `${isHovered ? '600 12px' : '500 11px'} -apple-system, BlinkMacSystemFont, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.name, node.x, node.y + node.radius + 14);
    }

    this.ctx.restore();
  }

  animate() {
    this.updatePhysics();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  resetView() {
    this.scale = 0.85;
    this.offsetX = this.width / 2;
    this.offsetY = this.height / 2;
    this.alpha = 0.8;
  }

  zoomIn() {
    this.scale = Math.min(3.5, this.scale * 1.2);
  }

  zoomOut() {
    this.scale = Math.max(0.2, this.scale * 0.8);
  }
}
