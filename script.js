function showHologram(hologramId) {
    document.getElementById(hologramId).classList.add('active');
}

function closeHologram(hologramId) {
    document.getElementById(hologramId).classList.remove('active');
}

// Show notification
function showNotification(title, text) {
    document.getElementById('notificationTitle').textContent = title;
    document.getElementById('notificationText').textContent = text;
    document.getElementById('notification').classList.add('active');
    
    setTimeout(() => {
        document.getElementById('notification').classList.remove('active');
    }, 3000);
}

// Audio context for better performance (single instance)
class AudioManager {
    constructor() {
        this.context = null;
        this.initialized = false;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.log("Web Audio API not supported");
            this.initialized = false;
        }
    }
    
    playCollectSound() {
        if (!this.initialized) return;
        
        try {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
            
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + 0.3);
        } catch (e) {
            console.log("Audio error:", e);
        }
    }
    
    playPowerUpSound() {
        if (!this.initialized) return;
        
        try {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            oscillator.frequency.value = 1200;
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.4, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
            
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + 0.5);
        } catch (e) {
            console.log("Audio error:", e);
        }
    }
}

// Main Game Class
class PortfolioExplorerGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Car properties
        this.car = null;
        this.carSpeed = 0;
        this.carMaxSpeed = 0.15;
        this.carAcceleration = 0.008;
        this.carDeceleration = 0.02;
        this.carRotationSpeed = 0.025;
        this.carRotation = 0;
        this.wheelRotation = 0;
        
        // Car flame effect
        this.flameEffect = null;
        this.isFlameOn = false;
        
        // Audio manager
        this.audioManager = new AudioManager();
        
        // Engine sound
        this.engineSound = null;
        this.engineContext = null;
        this.engineOscillator = null;
        this.engineGain = null;
        
        // Input state
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            Space: false,
            KeyR: false,
            KeyH: false
        };
        
        // Mobile input state
        this.mobileInput = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        };
        
        // Game objects
        this.objects = [];
        this.orbs = [];
        this.animatingOrbs = []; // New: Track orbs that are animating
        this.terrain = null;
        this.obstacles = [];
        this.powerUps = [];
        this.animatingPowerUps = []; // New: Track power-ups that are animating
        this.collectedOrbs = 0;
        this.totalOrbs = 35;
        this.requiredOrbs = 30;
        
        // Power-up system
        this.activePowerUp = null;
        this.powerUpDuration = 0;
        this.powerUpTypes = {
            SPEED_BOOST: 'speed',
            MAGNET: 'magnet',
            DOUBLE_POINTS: 'double'
        };
        
        // Collision cooldown
        this.collisionCooldown = false;
        this.collisionCooldownTime = 1000;
        
        // Timer
        this.startTime = null;
        this.gameTime = 0;
        this.timerInterval = null;
        
        // Exploration mechanics
        this.radarRange = 50;
        this.explorationArea = 200;
        
        // Game state
        this.gameStarted = false;
        this.gameOver = false;
        this.clock = new THREE.Clock();
        
        // Portfolio unlock states
        this.unlockRequirements = {
            about: 5,
            skills: 10,
            experience: 15,
            projects: 20,
            contact: 25
        };
        this.sectionStates = {
            about: false,
            skills: false,
            experience: false,
            projects: false,
            contact: false
        };
        
        // Camera smoothing
        this.cameraTarget = new THREE.Vector3();
        this.cameraPosition = new THREE.Vector3();
        this.cameraSmoothing = 0.25;
        
        // Animation frame management
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        
        // Car physics smoothing
        this.carVelocity = new THREE.Vector3();
        this.carTargetPosition = new THREE.Vector3();
        
        // Mini-map
        this.miniMapCanvas = null;
        this.miniMapContext = null;
        
        this.init();
    }
    
    init() {
        console.log("Initializing Portfolio Explorer...");
        
        // Set up the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0f1d);
        this.scene.fog = new THREE.Fog(0x0a0f1d, 50, 300);
        
        // Set up the camera (third-person following car)
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 15);
        
        // Set up the renderer with performance optimizations
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance",
            alpha: false
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('canvasContainer').appendChild(this.renderer.domElement);
        
        // Set up lighting
        this.setupLighting();
        
        // Create the environment
        this.createEnvironment();
        
        // Create the car
        this.createCar();
        
        // Create hidden orbs
        this.createOrbs();
        
        // Create obstacles
        this.createObstacles();
        
        // Create power-ups
        this.createPowerUps();
        
        // Set up controls
        this.setupControls();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize radar
        this.initRadar();
        
        // Initialize mini-map
        this.initMiniMap();
        
        // Initialize engine sound
        this.initEngineSound();
        
        // Start the game loop
        this.animate();
        
        // Hide loading screen after setup
        this.hideLoadingScreen();
        
        console.log("Game initialized successfully");
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024; // Reduced from 2048 for performance
        directionalLight.shadow.mapSize.height = 1024; // Reduced from 2048 for performance
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
        
        // Add some point lights
        const pointLight = new THREE.PointLight(0x6cb2ff, 0.5, 100);
        pointLight.position.set(0, 20, 0);
        this.scene.add(pointLight);
    }
    
    createEnvironment() {
        // Create a large terrain with varied elevation
        const terrainGeometry = new THREE.PlaneGeometry(400, 400, 50, 50); // Reduced segments for performance
        const terrainMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1f3d,
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        
        // Create varied terrain with hills and valleys
        const vertices = terrainGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Create natural-looking terrain with multiple hills and valleys
            let elevation = 0;
            
            // Large hills
            elevation += Math.sin(x * 0.015) * Math.cos(z * 0.015) * 8;
            
            // Medium hills
            elevation += Math.sin(x * 0.03 + 10) * Math.cos(z * 0.03 + 5) * 4;
            
            // Small bumps
            elevation += Math.sin(x * 0.08 + 20) * Math.cos(z * 0.08 + 15) * 1.5;
            
            // Minimal random noise for smoother terrain
            elevation += (Math.random() - 0.5) * 0.8;
            
            vertices[i + 1] = elevation;
        }
        terrainGeometry.attributes.position.needsUpdate = true;
        terrainGeometry.computeVertexNormals();
        
        this.scene.add(this.terrain);
    }
    
    createCar() {
        const carGroup = new THREE.Group();
        
        // Scale factor for smaller car
        const scaleFactor = 0.8;
        
        // Main car body - more realistic design, scaled down
        const bodyGeometry = new THREE.BoxGeometry(3.5 * scaleFactor, 1.2 * scaleFactor, 6.5 * scaleFactor);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1f3d,
            metalness: 0.8,
            roughness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1 * scaleFactor;
        body.castShadow = true;
        carGroup.add(body);
        
        // Car top/cabin
        const topGeometry = new THREE.BoxGeometry(2.8 * scaleFactor, 1.2 * scaleFactor, 3.5 * scaleFactor);
        const topMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0d1f5e,
            metalness: 0.7,
            roughness: 0.3
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(0, 2.1 * scaleFactor, -0.5 * scaleFactor);
        top.castShadow = true;
        carGroup.add(top);
        
        // Windows
        const windowGeometry = new THREE.BoxGeometry(2.6 * scaleFactor, 0.8 * scaleFactor, 3.2 * scaleFactor);
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x90caf9,
            transparent: true,
            opacity: 0.7
        });
        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        windowMesh.position.set(0, 2.1 * scaleFactor, -0.5 * scaleFactor);
        carGroup.add(windowMesh);
        
        // Wheels - more realistic with white color
        const wheelGeometry = new THREE.CylinderGeometry(0.6 * scaleFactor, 0.6 * scaleFactor, 0.4 * scaleFactor, 8); // Reduced segments for performance
        const wheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xF5F5F5,
            metalness: 0.3,
            roughness: 0.7
        });
        
        // Front left wheel
        const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFL.position.set(-1.8 * scaleFactor, 0.6 * scaleFactor, 2.2 * scaleFactor);
        wheelFL.rotation.z = Math.PI / 2;
        wheelFL.castShadow = true;
        carGroup.add(wheelFL);
        
        // Front right wheel
        const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFR.position.set(1.8 * scaleFactor, 0.6 * scaleFactor, 2.2 * scaleFactor);
        wheelFR.rotation.z = Math.PI / 2;
        wheelFR.castShadow = true;
        carGroup.add(wheelFR);
        
        // Rear left wheel
        const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRL.position.set(-1.8 * scaleFactor, 0.6 * scaleFactor, -2.2 * scaleFactor);
        wheelRL.rotation.z = Math.PI / 2;
        wheelRL.castShadow = true;
        carGroup.add(wheelRL);
        
        // Rear right wheel
        const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRR.position.set(1.8 * scaleFactor, 0.6 * scaleFactor, -2.2 * scaleFactor);
        wheelRR.rotation.z = Math.PI / 2;
        wheelRR.castShadow = true;
        carGroup.add(wheelRR);
        
        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.3 * scaleFactor, 8, 8);
        const headlightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffcc,
            emissiveIntensity: 0.8
        });
        
        const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlightL.position.set(-1.2 * scaleFactor, 0.8 * scaleFactor, 3.2 * scaleFactor);
        carGroup.add(headlightL);
        
        const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlightR.position.set(1.2 * scaleFactor, 0.8 * scaleFactor, 3.2 * scaleFactor);
        carGroup.add(headlightR);
        
        // Taillights
        const taillightGeometry = new THREE.SphereGeometry(0.3 * scaleFactor, 8, 8);
        const taillightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff5252,
            emissive: 0xff5252,
            emissiveIntensity: 0.5
        });
        
        const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial);
        taillightL.position.set(-1.2 * scaleFactor, 0.8 * scaleFactor, -3.2 * scaleFactor);
        carGroup.add(taillightL);
        
        const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial);
        taillightR.position.set(1.2 * scaleFactor, 0.8 * scaleFactor, -3.2 * scaleFactor);
        carGroup.add(taillightR);
        
        // Spoiler
        const spoilerGeometry = new THREE.BoxGeometry(3 * scaleFactor, 0.3 * scaleFactor, 0.5 * scaleFactor);
        const spoilerMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1f3d });
        const spoiler = new THREE.Mesh(spoilerGeometry, spoilerMaterial);
        spoiler.position.set(0, 2.5 * scaleFactor, -3.2 * scaleFactor);
        spoiler.castShadow = true;
        carGroup.add(spoiler);
        
        // Create flame effect (initially hidden)
        this.createFlameEffect(carGroup, scaleFactor);
        
        carGroup.position.y = 5;
        carGroup.castShadow = true;
        
        this.scene.add(carGroup);
        this.car = carGroup;
        
        // Initialize target position
        this.carTargetPosition.copy(this.car.position);
    }
    
    createFlameEffect(carGroup, scaleFactor) {
        // Flame particle system
        const flameGeometry = new THREE.ConeGeometry(0.5 * scaleFactor, 1.5 * scaleFactor, 8);
        const flameMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4500,
            transparent: true,
            opacity: 0.8
        });
        
        this.flameEffect = new THREE.Mesh(flameGeometry, flameMaterial);
        this.flameEffect.position.set(0, 0.5 * scaleFactor, -3.5 * scaleFactor);
        this.flameEffect.rotation.x = Math.PI;
        
        // Initially hidden
        this.flameEffect.visible = false;
        
        carGroup.add(this.flameEffect);
    }
    
    initEngineSound() {
        try {
            this.engineContext = new (window.AudioContext || window.webkitAudioContext)();
            this.engineOscillator = this.engineContext.createOscillator();
            this.engineGain = this.engineContext.createGain();
            
            this.engineOscillator.connect(this.engineGain);
            this.engineGain.connect(this.engineContext.destination);
            
            this.engineOscillator.type = 'sawtooth';
            this.engineOscillator.frequency.value = 50;
            this.engineGain.gain.value = 0;
            
            this.engineOscillator.start();
        } catch (e) {
            console.log("Web Audio API not supported");
        }
    }
    
    updateEngineSound() {
        if (!this.engineContext || !this.engineOscillator || !this.engineGain) return;
        
        // Update engine sound based on car speed
        const targetFrequency = 50 + Math.abs(this.carSpeed) * 200;
        const targetGain = Math.min(0.1, Math.abs(this.carSpeed) * 0.5);
        
        // Smooth frequency transition
        this.engineOscillator.frequency.setTargetAtTime(
            targetFrequency, 
            this.engineContext.currentTime, 
            0.1
        );
        
        // Smooth gain transition
        this.engineGain.gain.setTargetAtTime(
            targetGain, 
            this.engineContext.currentTime, 
            0.1
        );
    }
    
    updateFlameEffect() {
        if ((this.keys.ArrowUp || this.mobileInput.up) && this.carSpeed > 0.01) {
            // Show flame when accelerating
            if (!this.isFlameOn) {
                this.flameEffect.visible = true;
                this.isFlameOn = true;
            }
            
            // Add some animation to the flame
            const scale = 0.8 + Math.random() * 0.4;
            this.flameEffect.scale.set(scale, scale, scale);
        } else {
            // Hide flame when not accelerating
            if (this.isFlameOn) {
                this.flameEffect.visible = false;
                this.isFlameOn = false;
            }
        }
    }
    
    createOrbs() {
        // Create hidden orbs scattered throughout the terrain
        for (let i = 0; i < this.totalOrbs; i++) {
            let x, z;
            let validPosition = false;
            
            // Try to find a valid position that's not too close to others
            while (!validPosition) {
                x = (Math.random() - 0.5) * this.explorationArea;
                z = (Math.random() - 0.5) * this.explorationArea;
                
                // Check distance from center (avoid clustering in center)
                const distanceFromCenter = Math.sqrt(x*x + z*z);
                if (distanceFromCenter > 30 && distanceFromCenter < 180) {
                    validPosition = true;
                    
                    // Check distance from other orbs
                    for (const orb of this.orbs) {
                        const distance = Math.sqrt(
                            Math.pow(x - orb.position.x, 2) + 
                            Math.pow(z - orb.position.z, 2)
                        );
                        if (distance < 15) {
                            validPosition = false;
                            break;
                        }
                    }
                }
            }
            
            // Get terrain height at this position
            const terrainHeight = this.getTerrainHeight(x, z);
            const y = terrainHeight + 2;
            
            const orbGeometry = new THREE.SphereGeometry(1, 12, 12); // Reduced segments for performance
            const orbMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x6cb2ff,
                emissive: 0x0d1f5e,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.7
            });
            
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.set(x, y, z);
            orb.castShadow = true;
            orb.userData = {
                type: 'orb',
                collected: false,
                id: i
            };
            
            // Add a subtle point light to make the orb glow slightly
            const orbLight = new THREE.PointLight(0x6cb2ff, 0.3, 10);
            orb.add(orbLight);
            
            this.scene.add(orb);
            this.orbs.push(orb);
        }
    }
    
    createPowerUps() {
        // Create power-ups scattered throughout the terrain
        for (let i = 0; i < 5; i++) {
            let x, z;
            let validPosition = false;
            
            // Try to find a valid position
            while (!validPosition) {
                x = (Math.random() - 0.5) * this.explorationArea;
                z = (Math.random() - 0.5) * this.explorationArea;
                
                // Check distance from center
                const distanceFromCenter = Math.sqrt(x*x + z*z);
                if (distanceFromCenter > 50 && distanceFromCenter < 150) {
                    validPosition = true;
                }
            }
            
            // Get terrain height at this position
            const terrainHeight = this.getTerrainHeight(x, z);
            const y = terrainHeight + 1;
            
            const powerUpGeometry = new THREE.OctahedronGeometry(1.2, 0);
            const powerUpMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff9800,
                emissive: 0xff5722,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            });
            
            const powerUp = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
            powerUp.position.set(x, y, z);
            powerUp.castShadow = true;
            powerUp.userData = {
                type: 'powerUp',
                collected: false,
                powerType: Object.values(this.powerUpTypes)[i % 3]
            };
            
            // Add a point light
            const powerUpLight = new THREE.PointLight(0xff9800, 0.5, 15);
            powerUp.add(powerUpLight);
            
            this.scene.add(powerUp);
            this.powerUps.push(powerUp);
        }
    }
    
    getTerrainHeight(x, z) {
        // Simple terrain height calculation based on the same function used to create the terrain
        let elevation = 0;
        
        // Large hills
        elevation += Math.sin(x * 0.015) * Math.cos(z * 0.015) * 8;
        
        // Medium hills
        elevation += Math.sin(x * 0.03 + 10) * Math.cos(z * 0.03 + 5) * 4;
        
        // Small bumps
        elevation += Math.sin(x * 0.08 + 20) * Math.cos(z * 0.08 + 15) * 1.5;
        
        // Minimal random noise for smoother terrain
        elevation += (Math.random() - 0.5) * 0.8;
        
        return elevation;
    }
    
    createObstacles() {
        // Create natural obstacles (trees, rocks) scattered throughout the terrain
        for (let i = 0; i < 60; i++) { // Reduced from 80 for performance
            const x = (Math.random() - 0.5) * this.explorationArea;
            const z = (Math.random() - 0.5) * this.explorationArea;
            const terrainHeight = this.getTerrainHeight(x, z);
            
            // Create trees
            if (Math.random() > 0.5) {
                const treeGroup = new THREE.Group();
                
                // Tree trunk
                const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.5, 3, 8);
                const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.y = 1.5;
                trunk.castShadow = true;
                treeGroup.add(trunk);
                
                // Tree leaves
                const leavesGeometry = new THREE.ConeGeometry(2, 4, 8);
                const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
                const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                leaves.position.y = 4;
                leaves.castShadow = true;
                treeGroup.add(leaves);
                
                treeGroup.position.set(x, terrainHeight, z);
                this.scene.add(treeGroup);
                this.obstacles.push(treeGroup);
            } 
            // Create rocks
            else {
                const rockGeometry = new THREE.DodecahedronGeometry(1 + Math.random(), 0);
                const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x546e7a });
                const rock = new THREE.Mesh(rockGeometry, rockMaterial);
                
                rock.position.set(x, terrainHeight + 1, z);
                
                rock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                
                rock.castShadow = true;
                this.scene.add(rock);
                this.obstacles.push(rock);
            }
        }
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            if (this.keys.hasOwnProperty(event.code)) {
                this.keys[event.code] = true;
                event.preventDefault();
            }
            
            // Toggle holograms with H key
            if (event.code === 'KeyH' && !this.keys.KeyH) {
                this.keys.KeyH = true;
                this.toggleHolograms();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            if (this.keys.hasOwnProperty(event.code)) {
                this.keys[event.code] = false;
                event.preventDefault();
            }
        });
        
        // Mobile controls
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const mobileUp = document.getElementById('mobileUp');
        const mobileDown = document.getElementById('mobileDown');
        const mobileLeft = document.getElementById('mobileLeft');
        const mobileRight = document.getElementById('mobileRight');
        const mobileSpace = document.getElementById('mobileSpace');
        const mobileReset = document.getElementById('mobileReset');
        
        // Up button
        mobileUp.addEventListener('touchstart', () => {
            this.mobileInput.up = true;
        });
        mobileUp.addEventListener('touchend', () => {
            this.mobileInput.up = false;
        });
        
        // Down button
        mobileDown.addEventListener('touchstart', () => {
            this.mobileInput.down = true;
        });
        mobileDown.addEventListener('touchend', () => {
            this.mobileInput.down = false;
        });
        
        // Left button
        mobileLeft.addEventListener('touchstart', () => {
            this.mobileInput.left = true;
        });
        mobileLeft.addEventListener('touchend', () => {
            this.mobileInput.left = false;
        });
        
        // Right button
        mobileRight.addEventListener('touchstart', () => {
            this.mobileInput.right = true;
        });
        mobileRight.addEventListener('touchend', () => {
            this.mobileInput.right = false;
        });
        
        // Space button
        mobileSpace.addEventListener('touchstart', () => {
            this.mobileInput.space = true;
        });
        mobileSpace.addEventListener('touchend', () => {
            this.mobileInput.space = false;
        });
        
        // Reset button
        mobileReset.addEventListener('touchstart', () => {
            this.keys.KeyR = true;
            setTimeout(() => {
                this.keys.KeyR = false;
            }, 100);
        });
    }
    
    setupEventListeners() {
        // Use requestAnimationFrame for resize to prevent excessive calls
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }, 250);
        });
        
        // Start button
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
        
        // Restart button
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    toggleHolograms() {
        // Close all holograms
        const holograms = document.querySelectorAll('.portfolio-hologram');
        holograms.forEach(hologram => {
            hologram.classList.remove('active');
        });
    }
    
    startGame() {
        console.log("Starting game...");
        this.gameStarted = true;
        document.getElementById('startScreen').style.display = 'none';
        
        // Start timer
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateTimerDisplay();
        }, 1000);
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    restartGame() {
        // Proper cleanup before restart
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        location.reload();
    }
    
    hideLoadingScreen() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                }, 500);
            }
            document.getElementById('loadingProgress').style.width = `${progress}%`;
        }, 100);
    }
    
    initRadar() {
        // Radar will be updated in the game loop
    }
    
    initMiniMap() {
        this.miniMapCanvas = document.getElementById('miniMapCanvas');
        this.miniMapContext = this.miniMapCanvas.getContext('2d');
        this.miniMapCanvas.width = 200;
        this.miniMapCanvas.height = 200;
    }
    
    updateRadar() {
        const radarDots = document.getElementById('radarDots');
        radarDots.innerHTML = '';
        
        // Check for orbs within radar range
        this.orbs.forEach(orb => {
            if (!orb.userData.collected) {
                const distance = this.car.position.distanceTo(orb.position);
                
                if (distance <= this.radarRange) {
                    // Calculate position on radar
                    const angle = Math.atan2(
                        orb.position.z - this.car.position.z,
                        orb.position.x - this.car.position.x
                    ) - this.car.rotation.y;
                    
                    const radarDistance = (distance / this.radarRange) * 90; // 90 is radar radius
                    
                    const radarX = 90 + Math.cos(angle) * radarDistance;
                    const radarY = 90 + Math.sin(angle) * radarDistance;
                    
                    // Create radar dot
                    const radarDot = document.createElement('div');
                    radarDot.className = 'radar-dot';
                    radarDot.style.left = `${radarX}px`;
                    radarDot.style.top = `${radarY}px`;
                    
                    // Add pulsing effect for nearby orbs
                    if (distance < 20) {
                        const pulse = document.createElement('div');
                        pulse.className = 'pulse-effect';
                        pulse.style.left = `${radarX}px`;
                        pulse.style.top = `${radarY}px`;
                        radarDots.appendChild(pulse);
                    }
                    
                    radarDots.appendChild(radarDot);
                }
            }
        });
    }
    
    updateMiniMap() {
        // Only update mini-map if it's visible
        const miniMap = document.querySelector('.mini-map');
        if (miniMap && window.getComputedStyle(miniMap).display !== 'none') {
            const ctx = this.miniMapContext;
            const width = this.miniMapCanvas.width;
            const height = this.miniMapCanvas.height;
            
            // Clear the mini-map
            ctx.fillStyle = 'rgba(15, 20, 35, 0.85)';
            ctx.fillRect(0, 0, width, height);
            
            // Draw border
            ctx.strokeStyle = '#6cb2ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, width, height);
            
            // Calculate scale for mini-map
            const scale = width / 400;
            
            // Draw car position
            const carX = (this.car.position.x + 200) * scale;
            const carY = (this.car.position.z + 200) * scale;
            
            ctx.fillStyle = '#6cb2ff';
            ctx.beginPath();
            ctx.arc(carX, carY, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw car direction
            const directionLength = 10;
            const directionX = carX + Math.sin(-this.car.rotation.y) * directionLength;
            const directionY = carY + Math.cos(-this.car.rotation.y) * directionLength;
            
            ctx.strokeStyle = '#6cb2ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(carX, carY);
            ctx.lineTo(directionX, directionY);
            ctx.stroke();
            
            // Draw orbs
            this.orbs.forEach(orb => {
                if (!orb.userData.collected) {
                    const orbX = (orb.position.x + 200) * scale;
                    const orbY = (orb.position.z + 200) * scale;
                    
                    ctx.fillStyle = '#6cb2ff';
                    ctx.beginPath();
                    ctx.arc(orbX, orbY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            
            // Draw power-ups
            this.powerUps.forEach(powerUp => {
                if (!powerUp.userData.collected) {
                    const powerX = (powerUp.position.x + 200) * scale;
                    const powerY = (powerUp.position.z + 200) * scale;
                    
                    ctx.fillStyle = '#ff9800';
                    ctx.beginPath();
                    ctx.arc(powerX, powerY, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }
    
    checkCollisions() {
        // Skip collision check if in cooldown
        if (this.collisionCooldown) return;
        
        // Check for obstacle collisions
        for (const obstacle of this.obstacles) {
            const distance = this.car.position.distanceTo(obstacle.position);
            if (distance < 3) {
                // Collision with obstacle, stop the car and reduce orb count by 1
                this.carSpeed = 0;
                
                // Reduce orb count if player has collected orbs (only by 1, not to 0)
                if (this.collectedOrbs > 0) {
                    this.collectedOrbs = Math.max(0, this.collectedOrbs - 1);
                    document.getElementById('orbsCount').textContent = `${this.collectedOrbs}/${this.requiredOrbs}`;
                    
                    // Update progress
                    const progress = (this.collectedOrbs / this.requiredOrbs) * 100;
                    document.getElementById('progressFill').style.width = `${progress}%`;
                    
                    // Show collision notification
                    showNotification('Collision!', 'You hit an obstacle and lost one energy node');
                    
                    // Update next unlock display
                    this.updateNextUnlock();
                    
                    // Set collision cooldown
                    this.collisionCooldown = true;
                    setTimeout(() => {
                        this.collisionCooldown = false;
                    }, this.collisionCooldownTime);
                }
                
                break;
            }
        }
    }
    
    updateCar(delta) {
        if (!this.car || !this.gameStarted || this.gameOver) return;
        
        // Reset car position if R key is pressed
        if (this.keys.KeyR) {
            this.car.position.set(0, 5, 0);
            this.carTargetPosition.set(0, 5, 0);
            this.carRotation = 0;
            this.carSpeed = 0;
        }
        
        // Apply power-up effects
        this.applyPowerUpEffects();
        
        // Handle acceleration and braking
        if (this.keys.ArrowUp || this.mobileInput.up) {
            this.carSpeed = Math.min(this.carSpeed + this.carAcceleration, this.carMaxSpeed);
        } else if (this.keys.ArrowDown || this.mobileInput.down) {
            this.carSpeed = Math.max(this.carSpeed - this.carAcceleration, -this.carMaxSpeed / 2);
        } else {
            // Gradually slow down when no keys are pressed
            if (this.carSpeed > 0) {
                this.carSpeed = Math.max(0, this.carSpeed - this.carDeceleration);
            } else if (this.carSpeed < 0) {
                this.carSpeed = Math.min(0, this.carSpeed + this.carDeceleration);
            }
        }
        
        // Handle steering (only when moving)
        if (Math.abs(this.carSpeed) > 0.01) {
            if (this.keys.ArrowLeft || this.mobileInput.left) {
                this.carRotation += this.carRotationSpeed * (this.carSpeed > 0 ? 1 : -1);
            }
            if (this.keys.ArrowRight || this.mobileInput.right) {
                this.carRotation -= this.carRotationSpeed * (this.carSpeed > 0 ? 1 : -1);
            }
        }
        
        // Handbrake effect
        if ((this.keys.Space || this.mobileInput.space) && Math.abs(this.carSpeed) > 0.1) {
            this.carSpeed *= 0.95; // Quick deceleration
        }
        
        // Update engine sound
        this.updateEngineSound();
        
        // Update flame effect
        this.updateFlameEffect();
        
        // Calculate target position
        this.carTargetPosition.x -= Math.sin(this.carRotation) * this.carSpeed;
        this.carTargetPosition.z -= Math.cos(this.carRotation) * this.carSpeed;
        
        // Adjust car height based on terrain with smoothing
        const terrainHeight = this.getTerrainHeight(this.carTargetPosition.x, this.carTargetPosition.z);
        this.carTargetPosition.y = terrainHeight + 2;
        
        // Smooth car movement using lerp
        const carSmoothing = 0.2;
        this.car.position.x += (this.carTargetPosition.x - this.car.position.x) * carSmoothing;
        this.car.position.y += (this.carTargetPosition.y - this.car.position.y) * carSmoothing;
        this.car.position.z += (this.carTargetPosition.z - this.car.position.z) * carSmoothing;
        
        // Update car rotation
        this.car.rotation.y = this.carRotation;
        
        // Rotate wheels when moving - smoother rotation
        this.wheelRotation += this.carSpeed * 5;
        this.car.children.forEach((child, index) => {
            if (index >= 4 && index <= 7) { // Wheels are children 4-7
                child.rotation.x = this.wheelRotation;
            }
        });
        
        // Check for collisions
        this.checkCollisions();
        
        // Update camera to follow car
        this.updateCamera(delta);
        
        // Update speed display
        const speedKmh = Math.abs(Math.round(this.carSpeed * 100));
        document.getElementById('speedDisplay').textContent = `${speedKmh} km/h`;
    }
    
    applyPowerUpEffects() {
        // Apply active power-up effects
        if (this.activePowerUp) {
            this.powerUpDuration -= 16; // Assuming 60fps
            
            if (this.powerUpDuration <= 0) {
                // Power-up expired
                this.deactivatePowerUp();
            } else {
                // Apply effects based on power-up type
                switch (this.activePowerUp) {
                    case this.powerUpTypes.SPEED_BOOST:
                        this.carMaxSpeed = 0.25; // Increased speed
                        break;
                    case this.powerUpTypes.MAGNET:
                        // Attract nearby orbs
                        this.attractNearbyOrbs();
                        break;
                    case this.powerUpTypes.DOUBLE_POINTS:
                        // Double points are handled when collecting orbs
                        break;
                }
            }
        } else {
            // Reset to normal values when no power-up is active
            this.carMaxSpeed = 0.15;
        }
    }
    
    attractNearbyOrbs() {
        // Attract nearby orbs towards the car
        this.orbs.forEach(orb => {
            if (!orb.userData.collected) {
                const distance = this.car.position.distanceTo(orb.position);
                if (distance < 20) {
                    // Move orb towards car
                    const direction = new THREE.Vector3()
                        .subVectors(this.car.position, orb.position)
                        .normalize()
                        .multiplyScalar(0.1);
                    
                    orb.position.add(direction);
                }
            }
        });
    }
    
    deactivatePowerUp() {
        this.activePowerUp = null;
        this.powerUpDuration = 0;
        document.getElementById('powerUpStatus').textContent = 'None Active';
        showNotification('Power-up Expired', 'Your power-up has worn off');
    }
    
    updateCamera(delta) {
        // Third-person camera following the car with smoothing
        const cameraDistance = 15;
        const cameraHeight = 8;
        
        // Calculate target camera position
        const targetX = this.car.position.x + Math.sin(this.car.rotation.y) * cameraDistance;
        const targetZ = this.car.position.z + Math.cos(this.car.rotation.y) * cameraDistance;
        const targetY = this.car.position.y + cameraHeight;
        
        // Smooth camera movement using lerp with delta time for consistent smoothing
        const smoothing = this.cameraSmoothing * (delta * 60); // Adjust for frame rate
        
        this.camera.position.x += (targetX - this.camera.position.x) * smoothing;
        this.camera.position.y += (targetY - this.camera.position.y) * smoothing;
        this.camera.position.z += (targetZ - this.camera.position.z) * smoothing;
        
        // Make camera look at the car with a slight offset for better view
        this.camera.lookAt(
            this.car.position.x,
            this.car.position.y + 2,
            this.car.position.z
        );
    }
    
    // NEW: Optimized orb collection with batched animation
    updateAnimations(delta) {
        // Update orb animations
        for (let i = this.animatingOrbs.length - 1; i >= 0; i--) {
            const orb = this.animatingOrbs[i];
            orb.scale.multiplyScalar(0.85); // Scale down
            
            if (orb.scale.x < 0.1) {
                this.scene.remove(orb);
                this.animatingOrbs.splice(i, 1);
            }
        }
        
        // Update power-up animations
        for (let i = this.animatingPowerUps.length - 1; i >= 0; i--) {
            const powerUp = this.animatingPowerUps[i];
            powerUp.scale.multiplyScalar(0.85); // Scale down
            
            if (powerUp.scale.x < 0.1) {
                this.scene.remove(powerUp);
                this.animatingPowerUps.splice(i, 1);
            }
        }
    }
    
    checkOrbCollisions() {
        for (let i = 0; i < this.orbs.length; i++) {
            const orb = this.orbs[i];
            if (!orb.userData.collected) {
                const distance = this.car.position.distanceTo(orb.position);
                if (distance < 3) {
                    this.collectOrb(orb, i);
                    break; // Only collect one orb per frame to prevent multiple collisions
                }
            }
        }
    }
    
    checkPowerUpCollisions() {
        for (let i = 0; i < this.powerUps.length; i++) {
            const powerUp = this.powerUps[i];
            if (!powerUp.userData.collected) {
                const distance = this.car.position.distanceTo(powerUp.position);
                if (distance < 3) {
                    this.collectPowerUp(powerUp, i);
                    break; // Only collect one power-up per frame
                }
            }
        }
    }
    
    // OPTIMIZED: Orb collection without recursive animation
    collectOrb(orb, index) {
        orb.userData.collected = true;
        
        // Remove from main array
        this.orbs.splice(index, 1);
        
        // Add to animation list
        this.animatingOrbs.push(orb);
        
        // Update collected count
        let points = 1;
        if (this.activePowerUp === this.powerUpTypes.DOUBLE_POINTS) {
            points = 2;
        }
        
        this.collectedOrbs += points;
        document.getElementById('orbsCount').textContent = `${this.collectedOrbs}/${this.requiredOrbs}`;
        
        // Update progress
        const progress = (this.collectedOrbs / this.requiredOrbs) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        
        // Play sound effect (optimized)
        this.audioManager.playCollectSound();
        
        // Show notification
        let message = `You found a hidden energy node`;
        if (points > 1) {
            message += ` (Double points active!)`;
        }
        message += ` (${this.collectedOrbs}/${this.requiredOrbs})`;
        
        showNotification('Node Discovered!', message);
        
        // Check if any portfolio sections can be unlocked
        this.checkPortfolioUnlocks();
        
        // Check if all required orbs are collected
        if (this.collectedOrbs >= this.requiredOrbs) {
            this.gameComplete();
        }
    }
    
    // OPTIMIZED: Power-up collection without recursive animation
    collectPowerUp(powerUp, index) {
        powerUp.userData.collected = true;
        
        // Remove from main array
        this.powerUps.splice(index, 1);
        
        // Add to animation list
        this.animatingPowerUps.push(powerUp);
        
        // Activate the power-up
        this.activePowerUp = powerUp.userData.powerType;
        this.powerUpDuration = 10000; // 10 seconds
        
        // Update power-up status display
        let powerUpName = '';
        switch (this.activePowerUp) {
            case this.powerUpTypes.SPEED_BOOST:
                powerUpName = 'Speed Boost';
                break;
            case this.powerUpTypes.MAGNET:
                powerUpName = 'Orb Magnet';
                break;
            case this.powerUpTypes.DOUBLE_POINTS:
                powerUpName = 'Double Points';
                break;
        }
        
        document.getElementById('powerUpStatus').textContent = `${powerUpName} (${Math.ceil(this.powerUpDuration/1000)}s)`;
        
        // Show notification
        showNotification('Power-up Collected!', `You activated ${powerUpName}`);
        
        // Play sound effect (optimized)
        this.audioManager.playPowerUpSound();
    }
    
    checkPortfolioUnlocks() {
        if (this.collectedOrbs >= this.unlockRequirements.about && !this.sectionStates.about) {
            this.unlockPortfolioSection('about', 'About Me', 'aboutHologram');
        }
        
        if (this.collectedOrbs >= this.unlockRequirements.skills && !this.sectionStates.skills) {
            this.unlockPortfolioSection('skills', 'Skills & Expertise', 'skillsHologram');
        }
        
        if (this.collectedOrbs >= this.unlockRequirements.experience && !this.sectionStates.experience) {
            this.unlockPortfolioSection('experience', 'Professional Experience', 'experienceHologram');
        }
        
        if (this.collectedOrbs >= this.unlockRequirements.projects && !this.sectionStates.projects) {
            this.unlockPortfolioSection('projects', 'Projects & Contributions', 'projectsHologram');
        }
        
        if (this.collectedOrbs >= this.unlockRequirements.contact && !this.sectionStates.contact) {
            this.unlockPortfolioSection('contact', 'Contact Me', 'contactHologram');
        }
        
        this.updateNextUnlock();
    }
    
    unlockPortfolioSection(sectionId, sectionName, panelId) {
        this.sectionStates[sectionId] = true;
        
        // Show notification
        showNotification('Portfolio Unlocked!', `You've unlocked the ${sectionName} section`);
        
        // Show the portfolio hologram
        setTimeout(() => {
            showHologram(panelId);
        }, 1000);
    }
    
    updateNextUnlock() {
        if (this.collectedOrbs < this.unlockRequirements.about) {
            document.getElementById('nextUnlock').textContent = `About Me (${this.unlockRequirements.about} nodes)`;
        } else if (this.collectedOrbs < this.unlockRequirements.skills) {
            document.getElementById('nextUnlock').textContent = `Skills (${this.unlockRequirements.skills} nodes)`;
        } else if (this.collectedOrbs < this.unlockRequirements.experience) {
            document.getElementById('nextUnlock').textContent = `Experience (${this.unlockRequirements.experience} nodes)`;
        } else if (this.collectedOrbs < this.unlockRequirements.projects) {
            document.getElementById('nextUnlock').textContent = `Projects (${this.unlockRequirements.projects} nodes)`;
        } else if (this.collectedOrbs < this.unlockRequirements.contact) {
            document.getElementById('nextUnlock').textContent = `Contact (${this.unlockRequirements.contact} nodes)`;
        } else {
            document.getElementById('nextUnlock').textContent = 'All sections unlocked!';
        }
    }
    
    gameComplete() {
        this.gameOver = true;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Display final time
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        document.getElementById('finalTime').textContent = 
            `Mission Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('gameOverScreen').classList.add('active');
    }
    
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        const currentTime = performance.now();
        const delta = Math.min(0.05, (currentTime - this.lastFrameTime) / 1000);
        this.lastFrameTime = currentTime;
        
        if (this.gameStarted && !this.gameOver) {
            // Update car movement
            this.updateCar(delta);
            
            // Check for orb collisions
            this.checkOrbCollisions();
            
            // Check for power-up collisions
            this.checkPowerUpCollisions();
            
            // Update animations (NEW)
            this.updateAnimations(delta);
            
            // Update radar
            this.updateRadar();
            
            // Update mini-map
            this.updateMiniMap();
            
            // Update power-up timer display
            if (this.activePowerUp) {
                document.getElementById('powerUpStatus').textContent = 
                    `${this.activePowerUp} (${Math.ceil(this.powerUpDuration/1000)}s)`;
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game...");
    try {
        new PortfolioExplorerGame();
    } catch (error) {
        console.error("Error initializing game:", error);
        alert("Error loading the game. Please check the console for details.");
    }
});
