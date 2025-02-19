const renderer = document.getElementById('renderer');
const ctx = renderer.getContext('2d');

const position = {x: 0, y: 0};
const mouse = {x: 0, y: 0};
let scale = 40;

const maxTriggers = 10;

const types = [
	"AND",
	"OR",
	"NAND",
	"NOR",
	"XOR",
	"XNOR",
	"NOT",
	"BUTTON",
	"LED"
];

let power = [];

let components = [];
let hovering = undefined;
let dragging = undefined;
let wiring = undefined;
class Object {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.type = 'object';
		this.triggers = 0;
	}
	is() { return this.type }
	json() {
		return {
			type: this.type,
			x: this.x,
			y: this.y
		};
	}
	compute() {
		this.triggers++;
		if (this.triggers > maxTriggers) {
			console.log('Loop!');
			return;
		}
		const output = this.output();
		if (output) {
			power = power.filter(point => !(
				point.x == Math.round(output.x / (scale / 2)) && 
				point.y == Math.round(output.y / (scale / 2))
			));
			if (output.powered) {
				power.push({
					x: Math.round(output.x / (scale / 2)),
					y: Math.round(output.y / (scale / 2))
				});
			}
			components.forEach(component => {
				if (component != this && component.getPoints().some(point => 
					Math.round(point.x / (scale / 2)) == Math.round(output.x / (scale / 2)) && 
					Math.round(point.y / (scale / 2)) == Math.round(output.y / (scale / 2)))) {
					component.compute();
				}
			});
		}
	}
}
class Component extends Object {
	constructor(type, x, y) {
		super(x, y);
		this.type = type;
		this.sprite = new Image();
		this.sprite.src = `images/${this.type}.png`;
	}
	draw() {
		ctx.drawImage(this.sprite, this.x, this.y, scale, scale);
   }
	getPoints() {
		if (this.type == 'LED') {
			return [
				{x: this.x, y: this.y + scale},
				{x: this.x + scale, y: this.y + scale}
			];
		} else if (this.type == 'BUTTON') {
			return [
				{x: this.x + scale, y: this.y + scale / 2}
			];
		} else if (this.type == 'NOT') {
			return [
				{x: this.x, y: this.y + scale / 2},
				{x: this.x + scale, y: this.y + scale / 2}
			];
		} else {
			return [
				{x: this.x, y: this.y},
				{x: this.x, y: this.y + scale},
				{x: this.x + scale, y: this.y + scale / 2}
			];
		}
	}
	drawPoints() {
		this.getPoints().forEach(point => {
			drawPoint(point.x, point.y);
		});
	}
	drawHighlight() {
		ctx.fillStyle = '#9f9';
		ctx.fillRect(this.x - 4, this.y - 4, scale + 8, scale + 8);
	}
	hovered() {
		return mouse.x >= this.x && mouse.x <= this.x + scale && mouse.y >= this.y && mouse.y <= this.y + scale;
	}
	output() {
		switch (this.type) {
			case "BUTTON":
				if (hovering == this) {
					return {x: this.x + scale, y: this.y + scale / 2, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale / 2, powered: false};
				break;
			
			case "AND":
				if (isPowered(this.x, this.y) && isPowered(this.x, this.y + scale)) {
					return {x: this.x + scale, y: this.y + scale / 2, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale / 2, powered: false};
				break;
			
			case "OR":
				if (isPowered(this.x, this.y) || isPowered(this.x, this.y + scale)) {
					return {x: this.x + scale, y: this.y + scale / 2, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale / 2, powered: false};
				break;
			
			case "NAND":
				if (!(isPowered(this.x, this.y) && isPowered(this.x, this.y + scale))) {
					return {x: this.x + scale, y: this.y + scale / 2, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale / 2, powered: false};
				break;
			
			case "NOR":
				if (!(isPowered(this.x, this.y) || isPowered(this.x, this.y + scale))) {
					return {x: this.x + scale, y: this.y + scale / 2, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale / 2, powered: false};
				break;
			
			case "XOR":
				if (isPowered(this.x, this.y) && !isPowered(this.x, this.y + scale) || !isPowered(this.x, this.y) && isPowered(this.x, this.y + scale)) {
					return {x: this.x + scale, y: this.y + scale / 2, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale / 2, powered: false};
				break;
			
			case "XNOR":
				if (!(isPowered(this.x, this.y) && !isPowered(this.x, this.y + scale) || !isPowered(this.x, this.y) && isPowered(this.x, this.y + scale))) {
					return {x: this.x + scale, y: this.y + scale / 2, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale / 2, powered: false};
				break;
			
			case "NOT":
				if (!isPowered(this.x, this.y + scale / 2)) {
					return {x: this.x + scale, y: this.y + scale / 2, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale / 2, powered: false};
				break;
			
			case "LED":
				if (isPowered(this.x, this.y + scale)) {
					return {x: this.x + scale, y: this.y + scale, powered: true};
				}
				return {x: this.x + scale, y: this.y + scale, powered: false};
				break;
		
			default:
				break;
		}
		return undefined;
	}
}
class Wire extends Object{
	constructor(x, y, x2, y2) {
		super(x, y);
		this.x2 = x2;
		this.y2 = y2;
		this.color = '#555';
		this.type = 'WIRE';
	}
	draw() {
		ctx.strokeStyle = this.color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x2, this.y2);
		ctx.stroke();
	}
	getPoints() {
		return [
			{x: this.x, y: this.y},
			{x: this.x2, y: this.y2}
		];
	}
	drawPoints() {
		this.getPoints().forEach(point => {
			drawPoint(point.x, point.y);
		});
   }
	drawHighlight() {
		ctx.strokeStyle = '#9f9';
		ctx.lineWidth = 8;
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x2, this.y2);
		ctx.stroke();
	}
	hovered() {
		return mouse.x >= this.x && mouse.x <= this.x2 && mouse.y >= this.y && mouse.y <= this.y2;
	}
	length() {
		return Math.max(Math.abs(this.x - this.x2), Math.abs(this.y - this.y2));
	}
	json() {
		return {
			type: this.type,
			x: this.x,
			y: this.y,
			x2: this.x2,
			y2: this.y2
		};
	}
	output() {
		if (isPowered(this.x, this.y)) {
			return {x: this.x2, y: this.y2, powered: true};
		}
	}
}

function drawPoint(x, y) {
	ctx.fillStyle = '#555';
	if (isPowered(x, y)) {
		ctx.fillStyle = '#f00';
	}
	ctx.fillRect(x - 4, y - 4, 8, 8);
}
function createComponent(type) {
	const component = new Component(
		type, 
		Math.round(renderer.width / 2 / (scale / 2)) * (scale / 2),
		Math.round(renderer.height / 2 / (scale / 2)) * (scale / 2)
	);
	components.push(component);
	render();
}

function init() {
	// setup menu
	const menu = document.getElementById('menu');
	types.forEach(type => {
		const button = document.createElement('button');
		button.draggable = true
		const img = document.createElement('img');
		img.src = `images/${type}.png`;
		img.alt = `${type}`;
		img.draggable = false;
		button.appendChild(img);

		button.addEventListener('click', () => {
			createComponent(type);
		});
		button.addEventListener('dragstart', e => {
			e.dataTransfer.setData('text', type);
		});
		menu.appendChild(button);
	});

	// events
	window.addEventListener('resize', resize);
	renderer.addEventListener('mousedown', mousedown);
	renderer.addEventListener('mouseup', mouseup);
	renderer.addEventListener('mousemove', mousemove);
	renderer.addEventListener('drop', drop);
	renderer.addEventListener('dragover', e => e.preventDefault());
	window.addEventListener('keydown', keydown);

	// buttons
	const reset = document.getElementById('btn-reset');
	const load = document.getElementById('btn-load');
	const save = document.getElementById('btn-save');
	reset.addEventListener('click', () => {
		resetAll();
		render();
	});
	save.addEventListener('click', () => {
		const json = components.map(component => component.json());
		const data = JSON.stringify(json);
		const a = document.createElement('a');
		const file = new Blob([data], {type: 'text/plain'});
		a.href = URL.createObjectURL(file);
		a.download = 'circuit.json';
		a.click();
	});
	const loadFile = document.getElementById('load-file');
	load.addEventListener('click', () => {loadFile.click();});
	loadFile.addEventListener('change', e => {
		if (!e.target.files.length) return;
		const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = e => {
         const json = JSON.parse(e.target.result);
         resetAll();
         json.forEach(component => {
				let obj;
				if (component.type == 'WIRE') {
					obj = new Wire(component.x, component.y, component.x2, component.y2);
				} else {
					obj = new Component(component.type, component.x, component.y);
				}
            components.push(obj);
         });
         render();
      };
      reader.readAsText(file);
	});

	// initial render
	resize();
}

function resetAll() {
	components.length = 0;
	hovering = undefined;
	dragging = undefined;
	wiring = undefined;
}

function render() {
	computePower();

	const {width, height} = renderer;
	ctx.clearRect(0, 0, width, height);
	drawGrid();
	drawComponents();
}

function computePower() {
	power.length = 0;
	components.forEach(component => {
		component.triggers = 0;
	});
	components.forEach(component => {
		component.compute();
	});
}

function isPowered(x, y) {
	return power.some(point => 
		point.x == Math.round(x / (scale / 2)) && 
		point.y == Math.round(y / (scale / 2)));
}

function drawComponents() {
	if (hovering) hovering.drawHighlight();
	components.forEach(component => {
		component.draw();
	});
	components.forEach(component => {
		component.drawPoints();
	});
	if (wiring) wiring.draw();
}

function drawGrid() {
	const {width, height} = renderer;

	ctx.strokeStyle = '#aaa';
	ctx.lineWidth = 1;

   for (let x = 0; x <= width; x += scale/2) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, height);
		ctx.stroke();
	}
	for (let y = 0; y <= height; y += scale/2) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(width, y);
		ctx.stroke();
	}
}

// #region events
function resize() {
	renderer.width = (window.innerWidth / 4) * 3;
	renderer.height = window.innerHeight * 0.9;
	render();
}
function mousedown(e) {
	mouse.x = e.clientX;
	mouse.y = e.clientY - renderer.offsetTop;
	dragging = hovering;
	if (!hovering) {
		wiring = new Wire(
			Math.round(mouse.x / (scale / 2)) * (scale / 2),
			Math.round(mouse.y / (scale / 2)) * (scale / 2),
			Math.round(mouse.x / (scale / 2)) * (scale / 2),
			Math.round(mouse.y / (scale / 2)) * (scale / 2)
		);
	}
	render();
}
function mouseup(e) {
	mouse.x = e.clientX;
	mouse.y = e.clientY - renderer.offsetTop;
	dragging = undefined;
	if (wiring) {
		if (wiring.length() > scale/4) components.push(wiring);
		wiring = undefined;
	}
	render();
}
function mousemove(e) {
	mouse.x = e.clientX;
	mouse.y = e.clientY - renderer.offsetTop;
	hovering = undefined;
	for (let component of components) {
		if (component.hovered()) {
			hovering = component;
			break;
		}
	}
	if (dragging) {
		if (dragging.is() == 'WIRE') {
			let dx = dragging.x - dragging.x2;
			let dy = dragging.y - dragging.y2;
			dragging.x = Math.round(((mouse.x - dx / 2) - scale / 2) / (scale / 2)) * (scale / 2);
			dragging.y = Math.round(((mouse.y - dy / 2) - scale / 2) / (scale / 2)) * (scale / 2);
			dragging.x2 = dragging.x + dx;
			dragging.y2 = dragging.y + dy;
		} else {
			dragging.x = Math.round((mouse.x - scale / 2) / (scale / 2)) * (scale / 2);
			dragging.y = Math.round((mouse.y - scale / 2) / (scale / 2)) * (scale / 2);
		}
	}
	if (wiring) {
		if (Math.abs(wiring.x - mouse.x) > Math.abs(wiring.y - mouse.y)) {
			wiring.x2 = Math.round(mouse.x / (scale / 2)) * (scale / 2);
			wiring.y2 = wiring.y;
		} else {
			wiring.x2 = wiring.x;
			wiring.y2 = Math.round(mouse.y / (scale / 2)) * (scale / 2);
		}
   }
	render();
}
function drop(e) {
	e.preventDefault();
	mouse.x = e.clientX;
	mouse.y = e.clientY - renderer.offsetTop;
   const data = e.dataTransfer.getData('text');
	if (types.includes(data)) {
		createComponent(data);
		components[components.length - 1].x = Math.round((mouse.x - scale / 4) / (scale / 2)) * (scale / 2);
		components[components.length - 1].y = Math.round((mouse.y - scale / 4) / (scale / 2)) * (scale / 2);
	}
	render();
}
function keydown(e) {
	if (e.key == 'Delete' || e.key == 'Backspace') {
		components = components.filter(component => component != hovering);
		hovering = undefined;
		dragging = undefined;
		wiring = undefined;
		render();
	}
}

init();