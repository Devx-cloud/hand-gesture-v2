 const canvas = document.getElementById('flowCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particlesArray;
        const scanContainers = document.querySelectorAll('.scan-container');
        
        const FLOW_INFLUENCE_DIST_SQ = 150 * 150; 
        
        // Variabel global untuk mengontrol waktu animasi (gelombang)
        let frameCount = 0;
        // Kecepatan gelombang sangat lambat
        const WAVE_SPEED = 0.008; 

        class Particle {
            constructor(x, y, dirX, dirY, size) {
                this.x = x; 
                this.y = y; 
                this.dirX = dirX; 
                this.dirY = dirY; 
                this.size = size;
                
                // Properti glow/cahaya
                this.glowFactor = 0; // 0 (redup) hingga 1 (maksimal)
                this.phaseOffset = 0; // Offset fase untuk aliran terarah
            }
            
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                
                // Kontras partikel: Base 0.1 (redup), Max 1.0 (terang).
                const opacity = 0.1 + (this.glowFactor * 0.9); 
                ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`; 
                ctx.fill();
            }
            
            // Menerima frameCount untuk animasi gelombang waktu
            update(frameCount) { 
                // 1. Directional Flow Logic (Gelombang waktu dan posisi)
                
                // Input dasar untuk gelombang
                const waveInput = frameCount * WAVE_SPEED + this.phaseOffset;
                
                // Gelombang 1 (Original position)
                const waveValue1 = (Math.sin(waveInput) + 1) / 2; 

                // Gelombang 2 (180 derajat / PI phase shift, berlawanan posisi)
                const waveValue2 = (Math.sin(waveInput + Math.PI) + 1) / 2; 

                // // Gabungkan kedua gelombang, ambil nilai tertinggi untuk pendaran
                const combinedWaveValue = Math.max(waveValue1, waveValue2);
                // const combinedWaveValue = Math.max(waveValue1);

                // Membuat puncak cahaya sangat sempit (hanya glow ketika combinedWaveValue > 0.9)
                // Ambang batas 0.9: hanya glow ketika waveValue berada di 10% teratas
                // Kalikan 10 untuk mengembalikan skala glow ke [0, 1]
                let glow = Math.max(0, combinedWaveValue - 0.9) * 10; 
                
                // Normalisasi sisa gelombang [0, 1]
                this.glowFactor = glow; 
                
                // 2. Movement and Bounce Logic
                // Batas layar (existing logic)
                if (this.x > canvas.width - this.size || this.x < this.size) this.dirX *= -1;
                if (this.y > canvas.height - this.size || this.y < this.size) this.dirY *= -1;
                
                let nextX = this.x + this.dirX;
                let nextY = this.y + this.dirY;

                // Bounce off containers (existing logic)
                scanContainers.forEach(cont => {
                    const rect = cont.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    const rad = Math.max(rect.width, rect.height) / 2 + 15; 
                    
                    if (Math.sqrt((nextX - cx) ** 2 + (nextY - cy) ** 2) < rad) {
                        this.dirX *= -1; 
                        this.dirY *= -1;
                        nextX = this.x + this.dirX; 
                        nextY = this.y + this.dirY;
                    }
                });

                this.x = nextX; 
                this.y = nextY;
                this.draw();
            }
        }

        // Fungsi untuk menghitung offset fase berdasarkan posisi partikel
        function calculatePhaseOffset(particle, width, height) {
            const cx = width / 2;
            const cy = height / 2;
            
            // Hitung sudut dari pusat layar
            let angle = Math.atan2(particle.y - cy, particle.x - cx); // -PI hingga PI

            // Normalisasi sudut (0 hingga 2*PI, dengan 0/2PI di sisi kanan/sumbu X positif)
            if (angle < 0) {
                angle += 2 * Math.PI;
            }
            
            // Phase terbalik untuk gerakan searah jarum jam
            return 2 * Math.PI - angle;
        }


        function initParticles() {
            particlesArray = [];
            // Menggunakan pembagi 5000 untuk partikel yang lebih ramai
            const numParticles = (canvas.height * canvas.width) / 5000; 

            for (let i = 0; i < numParticles; i++) {
                let size = (Math.random() * 2) + 0.5; // Ukuran kecil untuk efek padat
                let x = Math.random() * innerWidth;
                let y = Math.random() * innerHeight;
                let dirX = (Math.random() * 0.4) - 0.2;
                let dirY = (Math.random() * 0.4) - 0.2;
                
                const p = new Particle(x, y, dirX, dirY, size);
                // Hitung dan set phaseOffset di sini
                p.phaseOffset = calculatePhaseOffset(p, innerWidth, innerHeight);
                particlesArray.push(p);
            }
        }

        function animateParticles() {
            requestAnimationFrame(animateParticles);
            
            // Inkrementasikan frame count (waktu global)
            frameCount++; 
            
            // PERUBAHAN: Hapus layar dengan warna latar belakang solid (opacity 1.0)
            // Ini menghilangkan jejak buram (smoothing/shadow effect) dari frame sebelumnya
            ctx.fillStyle = '#0d1117'; 
            ctx.fillRect(0, 0, innerWidth, innerHeight);

            // Perbarui partikel dengan frameCount
            particlesArray.forEach(p => p.update(frameCount)); 
            
            // Draw Lines
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    const connectionDistance = 20000;
                    let dist = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2);
                    
                    if (dist < connectionDistance) {
                        // Opacity dasar berdasarkan jarak
                        const distanceOpacity = 1 - dist / connectionDistance;

                        // Pengaruh glow (rata-rata glow factor dari kedua partikel)
                        const avgGlow = (particlesArray[a].glowFactor + particlesArray[b].glowFactor) / 2;
                        
                        // KONTRAST TERTINGGI. Opacity dasar sangat rendah (0.001) agar hampir tidak terlihat saat redup
                        const baseOpacity = 0.001; 
                        
                        // Glow Weight 1.0 memastikan kecerahan penuh saat avgGlow = 1
                        const finalOpacity = Math.min(1.0, distanceOpacity * (baseOpacity + avgGlow * 1.0)); 

                        ctx.strokeStyle = `rgba(0, 255, 255, ${finalOpacity})`;
                        ctx.lineWidth = 0.5; // Garis lebih tipis
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        // Penanganan perubahan ukuran jendela
        window.addEventListener('resize', () => {
            canvas.width = innerWidth; 
            canvas.height = innerHeight;
            // Panggil initParticles untuk menghitung ulang posisi dan fase
            setTimeout(initParticles, 100); 
        });
        
        // Inisialisasi dan mulai animasi
        window.onload = () => {
            initParticles();
            animateParticles();
        };