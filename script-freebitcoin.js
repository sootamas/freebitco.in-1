//http://freevpnaccess.com/
//http://www.freevpnonline.com/

var startTime; // registra a hora que iniciou para marcar a duração do processo
var startBalance; // registra a quantia inicial de BTC para calcular o lucro após o processo
var stopped = false; // flag que irá parar o processo caso true
var hiFlag = false; // quando true, a aposta será em HI, caso false, será em LO
var currentBet;
var resultados = []; // registra em cada rodada, se ganhou ou não e o resultado como 1 caso HI, -1 caso LO e 0 caso tenha caído na na área central
var victorySec = 0; // contador de vitórias e derrotas em sequência (derrotas em negativo)

var startValue = 0.00000001; // Don't lower the decimal point more than 4x of current balance
var minWait = 222; // tempo mínimo entre uma rodada e outra
var maxWait = 888; // espera máxima, que na verdade será maxWait + minWait
var stopBefore = 1; // In minutes for timer before stopping redirect on webpage

var valorSeguranca = 0; // até onde pode apostar
var porcentLucro = 0; // porcentagem de lucro q se deseja salvar a cada ganho
var tempoMaximo = 0; //tempo máximo que o processo durará, 0 caso ilimitado.
var resetFlag = false; // ** explicação desta variável na função "multiply"
var midFlag = false; // utilizada em alguns procedimentos de "quebra" de MID

var $loButton = $('#double_your_btc_bet_lo_button');
var $hiButton = $('#double_your_btc_bet_hi_button');

function multiply(balance){
	var multiply = parseFloat((currentBet * 2).toFixed(8)); // pega a aposta corrente e dobra
	if (multiply > balance - valorSeguranca) { //caso multiply seja maior que o limite que pode ser apostado
		if (resetFlag) { 
			//caso resetFlag esteja ativada, toda vez que a aposta estourar o limite, irá retornar ao startValue
			reset();
			return;
		}
		else {
			//caso resetFlag esteja desativada, toda vez que a aposta estourar o limite, irá reduzí-la pela metade, 
			//continuamente, até que seja um valor que possa ser apostado e seja superior a startValue
			do {
				multiply = multiply / 2;
			} while (multiply >= startValue && multiply > balance - valorSeguranca)
		}
	} 
	$('#double_your_btc_stake').val(multiply.toFixed(8));
	currentBet = multiply;
}
function getRandomWait(){
	var wait = Math.floor(Math.random() * maxWait ) + minWait;
	console.log('Waiting for ' + wait + 'ms before next bet.');
	return wait ;
}
function startGame(){
	startTime = new Date().getTime();
	startBalance = parseFloat($('#balance').text()); 
	currentBet = startValue;
	resultados = [];
	victorySec = 0;
	stopped = false;
	console.log('Game started!');
	reset();
	hiFlag ? $hiButton.trigger('click') : $loButton.trigger('click');
}
function stopGame(){
	console.log('Game will stop soon! Let me finish.');
	console.log ('Tempo de processo: ' + getTempoProcesso() + " segundos" );
	console.log ('Número de rodadas: ' + resultados.length );
	console.log ('Lucro: ' + (parseFloat($('#balance').text()) - startBalance).toFixed(8) + " BTC" );
	stopped = true;
}
function toggleHiLo () {
	hiFlag ? hiFlag = false : hiFlag = true;
}
function reset(){
	$('#double_your_btc_stake').val(startValue.toFixed(8));
	currentBet = startValue;
}
//apenas faz uma aposta baixa predefinida, pressupondo que seja mais provável uma perda na próxima jogada.
function saltTurn () {
	$('#double_your_btc_stake').val(startValue.toFixed(8));
	console.log("Salt Turn!");
}
function funcaoPreRodada() {
	var ant = analiseResultadosAnterioresSeguidos();
	if (ant != null) {
		if (ant.result == 0 && ant.repeat > 1)
			midFlag = true;
		else {
			midFlag = false;
			if (!ant.win && ant.repeat % 3 == 0)
				toggleHiLo();
		}
	}
	//if (victorySec % 4 == 0) 
		//toggleHiLo();
}

function stopBeforeRedirect(){
	var minutes = parseInt($('title').text());
	if( minutes < stopBefore )
	{
		console.log('Approaching redirect! Stop the game so we don\'t get redirected while loosing.');
		stopGame();
		return true;
	}
	return false;
}

function salvarLucro(winProfit) {
	valorSeguranca += Math.round(porcentLucro * winProfit * 100000000) / 100000000;
	console.log ("valorSeguranca = " + valorSeguranca.toFixed(8));
}

function paradaProgramada(balance) {
	if ((tempoMaximo > 0 && getTempoProcesso() > tempoMaximo) || parseFloat (startValue) + valorSeguranca > balance) {
		stopGame();
		return true;
	}
	return false;
}

function getTempoProcesso() { //em segundos
	return parseInt((new Date().getTime() - startTime)/1000);
}

$('#double_your_btc_bet_lose').unbind();
$('#double_your_btc_bet_win').unbind();
$('#double_your_btc_bet_lose').bind("DOMSubtreeModified",function(event){
	if( $(event.currentTarget).is(':contains("lose")') ){
		var balance = parseFloat($('#balance').text()); 
		//var current = currentBet; //parseFloat($('#double_your_btc_stake').val()) ;
		//var payout = parseFloat($("#double_your_btc_payout_multiplier").val());
		//var winProfit = getWinProfit(payout);
		var resultado = analiseResultado();
		
		resultados.push ({win: false, result: resultado});
		
		console.log('LOST! '+ parseFloat($('#double_your_btc_stake').val()).toFixed(8) + " " + (resultado ? (resultado > 0 ? "HI" : "LO") : "MID"));
		
		funcaoPreRodada();
		
		if( stopped ){
			stopped = false;
			return false;
		}
		
		if (victorySec > 0) { // caso venha de uma ou mais vitórias anterioras, retorna a aposta ao inicio
			reset();
			victorySec = -1;
		}
		else { // caso venha de uma derrota, multiply
			victorySec--;
			if (!midFlag)
				multiply(balance);
			else 
				saltTurn();
		}
		
		if (paradaProgramada(balance))
			return false;
		
		setTimeout(function(){
			hiFlag ? $hiButton.trigger('click') : $loButton.trigger('click');
		}, getRandomWait());
	}
});

$('#double_your_btc_bet_win').bind("DOMSubtreeModified",function(event){
	if( $(event.currentTarget).is(':contains("win")') ){
		var balance = parseFloat($('#balance').text()); 
		//var current = currentBet; //parseFloat($('#double_your_btc_stake').val());
		var payout = parseFloat($("#double_your_btc_payout_multiplier").val());
		var winProfit = getWinProfit(payout,parseFloat($('#double_your_btc_stake').val()));
		var resultado = analiseResultado();
		
		resultados.push ({win: true, result: resultado});
		
		console.log('WON! '+ winProfit.toFixed(8) + " " + (resultado ? (resultado > 0 ? "HI" : "LO") : "MID"));
		
		funcaoPreRodada();
		
		if( stopBeforeRedirect() )
			return;
		if (victorySec < 0) { //  retorna a aposta ao inicio depois de derrotas
			if (!midFlag) {
				reset();
				victorySec = 1;
			}
			if( stopped ){
				stopped = false;
				return false;
			}
		}
		else if (victorySec%2 == 0) { // dobra a aposta a cada duas vitórias consecutivas 
			multiply(balance);
			victorySec++;
		}
		// else contunua apostando
		
		
		salvarLucro (winProfit);
		
		if (paradaProgramada(balance))
			return false;
		
		setTimeout(function(){
			hiFlag ? $hiButton.trigger('click') : $loButton.trigger('click');
		}, getRandomWait());
	}
});

function getWinProfit(payout, current) {
	if (current)
		current = parseInt(current * 100000000);
	else
	    current = parseInt(currentBet * 100000000);
	return Math.floor(payout * current - current) / 100000000;
}

function getValorRoll() {
	var valorRoll = 0;
	valorRoll += parseInt($("#multiplier_first_digit").html()) * 10000;
	valorRoll += parseInt($("#multiplier_second_digit").html()) * 1000;
	valorRoll += parseInt($("#multiplier_third_digit").html()) * 100;
	valorRoll += parseInt($("#multiplier_fourth_digit").html()) * 10;
	valorRoll += parseInt($("#multiplier_fifth_digit").html());
	return valorRoll;
}

function getHiRange(){
	return parseInt($(".gt.gt_lt_span").html());
}

function getLoRange() {
	return parseInt($(".lt.gt_lt_span").html());
}

function analiseResultado() {
	var vr = getValorRoll();
	if (vr > getHiRange())
		return 1;
	else if (vr < getLoRange())
		return -1;
	else 
		return 0;
}
// analisa e retorna quantas vezes seguidas houve o mesmo resultado: {win: win, result: HiMidLo, repeat: repetição}
function analiseResultadosAnterioresSeguidos () {
	var p = resultados.length -1;
	if (p >= 0) {
		var win = resultados[p].win;
		var hiMidLo = resultados[p].result;
		do {
			p--;
		}while (p > 0 && resultados[p].win == win && resultados[p].result == hiMidLo) 
		return {win: win, result: hiMidLo, repeat: (resultados.length - p -1)}
	}
	return null;
}

function geraAposta (aposta, pLucro, tMaximo){
	var balance = parseFloat($('#balance').text()); 
	valorSeguranca = aposta ? balance - aposta/100000000 : 0;
	porcentLucro = pLucro ? pLucro : 0;
	tempoMaximo = tMaximo ? tMaximo : 0;
	startGame();
}
