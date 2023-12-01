function draw(time_stamp) {
    // if (previous_time_stamp == undefined) {
    //     previous_time_stamp = time_stamp
    // } else {
    //     console.log(time_stamp - previous_time_stamp)
    //     previous_time_stamp = time_stamp
    // }

    const canvas = document.getElementById("canvas")
    const ctx = canvas.getContext("2d")
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight

    canvas.width = width
    canvas.height = height

    if (boids.length == 0) {
        init(width, height, canvas)
    }

    // clear screen
    ctx.save()
    ctx.fillStyle = "rgba(0, 0, 0, 1)"
    ctx.fillRect(0, 0, width, height)
    ctx.restore()


    for (let i = 0; i < boids.length; i++) {
        
        boids[i].update_boid(width, height, boids);
        boids[i].draw_boid(ctx)
    }

    window.requestAnimationFrame(draw)
}

class Boid {
    constructor(x, y, r, h) {
        this.pos = new Vec2(x, y)
        this.r = r
        this.h = h
        this.trail = []
    }

    draw_boid(ctx) {
        ctx.save()

        let s = 100;
        let l = 70;
        let color = "hsl(" + this.h + "," + s + "%, " + l + "%)"

        ctx.translate(this.pos.x, this.pos.y)
        ctx.rotate(this.r);
        ctx.fillStyle = color
        ctx.fill(boid)
        ctx.restore()

        if (this.trail.length > 0) {
            ctx.save()
            ctx.strokeStyle = color
            var trail = new Path2D()
            trail.moveTo(this.trail[0].x, this.trail[0].y)
            for (let i = 1; i < this.trail.length; i++) {
                let dist = Vec2.length(Vec2.sub(this.trail[i], this.trail[i - 1]))
                if (dist < 10){
                    trail.lineTo(this.trail[i].x, this.trail[i].y)
                }else{
                    trail.moveTo(this.trail[i].x, this.trail[i].y)
                }
            }
            ctx.stroke(trail)
            ctx.restore();
        }

        
    }

    update_boid(width, height, boids) {
        let cohesion_sum = new Vec2(0, 0)
        let cohesion_count = 0;
        let alignment_sum = new Vec2(0, 0)
        let alignment_count = 0;
        for (let i = 0; i < boids.length; i++) {
            if (boids[i] == this) {
                continue
            }
            let d = Vec2.wrapped_distance(this.pos, boids[i].pos, width, height)
            if (d < 40) {
                let d_vec = Vec2.sub(this.pos, boids[i].pos);
                // Todo, fix angle blending
                // consider 10 degrees approaching 350 degrees, the vector will incorrectly rotate counter clockwise
                //this.r = this.r + (Vec2.angle(d_vec) - this.r) * 0.001 * (d / 80)
                this.r = blend_angle(this.r, Vec2.angle(d_vec), 0.01 * ((80-d)/80))
            }

            if (d < 80) {
                cohesion_sum = Vec2.add(cohesion_sum, boids[i].pos)
                cohesion_count++
                alignment_sum = Vec2.add(alignment_sum, Vec2.from_angle(boids[i].r))
                alignment_count++
            }
        }

        if (cohesion_count != 0) {
            let cohesion_center = Vec2.multiply(cohesion_sum, 1 / cohesion_count)
            let cohesion_vec = Vec2.sub(this.pos, cohesion_center)
            //this.r = this.r + (Vec2.angle(cohesion_center) - this.r) * 0.0005
            this.r = blend_angle(this.r, Vec2.angle(cohesion_center), 0.001)
        }

        if (alignment_count != 0) {
            let alignment_average = Vec2.multiply(alignment_sum, 1 / alignment_count)
            //this.r = this.r + (Vec2.angle(cohesion_average) - this.r) * 0.0025
            this.r = blend_angle(this.r, Vec2.angle(alignment_average), 0.005)
        }

        if (left_mouse_pressed && !right_mouse_pressed) {
            let mouse_direction = Vec2.sub(mousePos, this.pos)
            let mouse_distance = Math.max(Vec2.length(mouse_direction), 250);
            let mouse_angle = Vec2.angle(mouse_direction)
            this.r = blend_angle(this.r, mouse_angle, 1000 / (mouse_distance * mouse_distance))
        }

        if (!left_mouse_pressed && right_mouse_pressed) {
            let mouse_direction = Vec2.sub(mousePos, this.pos)
            let mouse_distance = Math.max(Vec2.length(mouse_direction), 250);
            let mouse_angle = Vec2.angle(Vec2.multiply(mouse_direction, -1))
            this.r = blend_angle(this.r, mouse_angle, 1000 / (mouse_distance * mouse_distance))
        }

        this.pos = Vec2.add(this.pos, Vec2.multiply(Vec2.from_angle(this.r), 3))

        if (this.pos.x < 0) {
            this.pos.x += width
        }
        if (this.pos.y < 0) {
            this.pos.y += height
        }
        if (this.pos.x > width) {
            this.pos.x -= width
        }
        if (this.pos.y > height) {
            this.pos.y -= height
        }
        if (this.trail.push(this.pos) > 200) {
            this.trail = this.trail.slice(1)
        }
    }
}

function mod(a, m){
    return a - Math.floor(a / m) * m
}

function blend_angle(first, second, factor) {
    let difference = second - first
    let new_difference = mod(difference + Math.PI, Math.PI * 2) - Math.PI
    let result = first + new_difference * factor

    return result
}

class Vec2 {
    constructor(x, y) {
        this.x = x
        this.y = y
    }

    static add(left, right) {
        return new Vec2(left.x + right.x, left.y + right.y)
    }

    static sub(left, right) {
        return new Vec2(left.x - right.x, left.y - right.y)
    }

    static multiply(left, scalar) {
        return new Vec2(left.x * scalar, left.y * scalar)
    }

    static from_angle(angle) {
        return new Vec2(Math.cos(angle), Math.sin(angle))
    }

    static angle(vec) {
        return Math.atan2(vec.y, vec.x)
    }

    static wrapped_distance(left, right, width, height) {
        let x = Math.min(Math.abs(left.x - right.x), width - Math.abs(left.x - right.x))
        let y = Math.min(Math.abs(left.y - right.y), height - Math.abs(left.y - right.y))
        return Math.sqrt(x * x + y * y)
    }

    static angle_between(from, to) {
        return Vec2.angle(Vec2.sub(to, from))
    }

    static length(vec) {
        return Math.sqrt(vec.x * vec.x + vec.y * vec.y)
    }
}


let boids = []
let previous_time_stamp
let boid
let mousePos = new Vec2(0, 0)
let left_mouse_pressed = false
let right_mouse_pressed = false



function init(width, height, canvas) {
    boid = new Path2D()
    boid.moveTo(0, 0)
    boid.lineTo(-5, 5)
    boid.lineTo(20, 0)
    boid.lineTo(-5, -5)
    boid.lineTo(0, 0)
    
    for (let i = 0; i < 50; i++) {
        boids.push(new Boid(Math.random() * width, Math.random() * height, Math.random() * 2 * Math.PI, Math.random() * 360))
    }

    canvas.addEventListener('mousemove', function(event){
        mousePos = new Vec2(event.clientX, event.clientY)
    })
    canvas.addEventListener('mousedown', function(event){
        if (event.button == 0) {
            left_mouse_pressed = true
        }
        if (event.button == 2) {
            right_mouse_pressed = true
        }
    })
    canvas.addEventListener('mouseup', function(event){
        if (event.button == 0) {
            left_mouse_pressed = false
        }
        if (event.button == 2) {
            right_mouse_pressed = false
        }
    })
}
window.requestAnimationFrame(draw)
