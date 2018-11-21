let mysql = require('mysql');
let express =  require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let bodyParser = require('body-parser');
let logger = require('morgan');
let methodOverride = require('method-override')
let cors = require('cors');
var os = require('os');
var ifaces = os.networkInterfaces();
var moment = require('moment');
var Gpio = require('onoff').Gpio

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(cors());

function log_(str){
    let now = moment().format("DD/MM/YYYY hh:mm:ss")
    let msg = "[" + now + "] " + str
    console.log(msg)
}

/*var db_config = {
    host: "10.8.0.50",
    user: "root",
    password: "Mudaragora00",
    database: "zoosp"
};*/

var db_config = {
    host: "10.0.2.180",
    user: "root",
    password: "Mudaragora00",
    database: "zoosp"
};

let con;

function handleDisconnect() {

    con = mysql.createConnection(db_config);
   
    con.connect(function(err) {
       if (err){
        setTimeout(handleDisconnect, 2000);
       }

       con.on('error', function(err) {

        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();  

        } else 
            throw err;  
        
    });

    log_("Database conectado!")		    
    log_("Aguardando conexões ...")	
   });
}

handleDisconnect()


var gpioPageMultiple     = new Gpio(4, 'in', 'both', {debounceTimeout: 10} )
var gpioPageHistory      = new Gpio(5, 'in', 'both', {debounceTimeout: 10} )
var gpioDecrementCounter = new Gpio(6, 'in', 'both', {debounceTimeout: 10} )
var gpioSuccess          = new Gpio(3, 'out'); 
var gpioError            = new Gpio(2, 'out'); 

gpioSuccess.writeSync(0)
gpioError.writeSync(0)

gpioPageMultiple.watch(function(err, value) {   
	
    if(value == 0){
	    console.log("GPIO 4 Desligado, enviando sinal de mudar página!")
    	io.emit('gpioPageMultiple', {gpio: '4', event: value});    
   }
});

gpioPageHistory.watch(function(err, value) {    

    if(value == 0){
        console.log("GPIO 5 Desligado, enviando sinal de mudar página!")
        io.emit('gpioPageHistory', {gpio: '5', event: value});    
    }        	
});

gpioDecrementCounter.watch(function(err, value) {  
  
    if(value == 0){  
        console.log("GPIO 6 Desligado, enviando sinal de mudar página!")
    	io.emit('gpioDecrementCounter', {gpio: '6', event: value});   
  }
});

function blinkError(){

   const iv = setInterval(() => gpioError.writeSync(1), 500);

    setTimeout(() => {
        clearInterval(iv);
        gpioError.writeSync(0);        
    }, 5000);
}

function blinkSuccess(){    
    const iv = setInterval(() => gpioSuccess.writeSync(1), 500);

    setTimeout(() => {
        clearInterval(iv);
        gpioSuccess.writeSync(0);        
    }, 5000);
}

function checkTicketExists(req, res){

    let idTotem = req.body.id    
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando se ticket existe:', ticket)

    let sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel FROM 3a_estoque_utilizavel WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

    //log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;  
        
        if(result[0])
            checkTicketIsSold(req, res)

        else {
            let callback = [{"callback": 1, "result": result}]
            res.json({"success": callback});            
        }            
    });
}

function checkTicketIsSold(req, res){

    let idTotem = req.body.id
    let ticket = req.body.ticket    

    log_('Totem: '+ idTotem + ' - Verificando ticket vendido:', ticket)    

    let sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel,\
            3a_log_vendas.data_log_venda \
            FROM 3a_estoque_utilizavel \
        INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

    //log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;  
                
        if(result[0])
            checkTicketAccess(req, res, result);     

        else {
            let callback = [{"callback": 2, "result": result}]
            res.json({"success": callback});            
        }             
    });
}

function checkTicketAccess(req, res, result){

    let idTotem = req.body.id
    let idArea = req.body.idArea
    let idPorta = req.body.idPorta
    let ticket = result[0].id_estoque_utilizavel

    log_('Totem: '+ idTotem + ' - Verificando acesso do ticket: ' + ticket)
   
    let sql = "SELECT * \
            FROM 3a_estoque_utilizavel \
        INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
        INNER join 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
        INNER join 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
        INNER join 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
        INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_area_acesso = 3a_subtipo_area_autorizada.fk_id_area_acesso \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + " \
        AND 3a_porta_acesso.id_porta_acesso = " + idPorta + " \
        AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";"

    //log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        
        if(result[0])
            checkTicketContinue(req, res, result)

        else 
            checkTicketAccessPoints(ticket, res)                 
    });
}

function checkTicketAccessPoints(ticket, res){    
            
    log_('Totem: Verificando pontos permitidos do ticket: ' + ticket)
   
    let sql = "SELECT 3a_ponto_acesso.nome_ponto_acesso, 3a_estoque_utilizavel.id_estoque_utilizavel \
                FROM  3a_estoque_utilizavel \
                INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
                INNER join 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
                INNER join 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
                INNER join 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
                INNER JOIN 3a_area_acesso ON 3a_area_acesso.id_area_acesso = 3a_subtipo_area_autorizada.fk_id_area_acesso \
                INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_area_acesso = 3a_area_acesso.id_area_acesso \
                INNER JOIN 3a_ponto_acesso ON 3a_ponto_acesso.id_ponto_acesso = 3a_porta_acesso.fk_id_ponto_acesso \
            WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

    //log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        
        let callback = [{"callback": 3, "result": result}]
        res.json({"success": callback});   

    });    
}

function checkTicketContinue(req, res, result){

    let idTotem = req.body.id        
    let idPorta = req.body.idPorta
    let idArea = req.body.idArea
    let ticket = result[0].id_estoque_utilizavel

    log_('Totem: '+ idTotem + ' - Verificando ticket continuação: ' + ticket)
   
        let sql = "SELECT 3a_log_vendas.data_log_venda,\
            3a_estoque_utilizavel.id_estoque_utilizavel,\
            3a_estoque_utilizavel.utilizado,\
            3a_produto.nome_produto,\
            3a_tipo_produto.nome_tipo_produto, \
            3a_porta_acesso.*,\
            3a_ponto_acesso.nome_ponto_acesso,\
            3a_validade.* \
            FROM 3a_log_vendas \
        INNER JOIN 3a_produto ON 3a_produto.id_produto = 3a_log_vendas.fk_id_produto \
        INNER join 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
        INNER JOIN 3a_tipo_produto ON 3a_tipo_produto.id_tipo_produto = 3a_produto.fk_id_tipo_produto \
        INNER JOIN 3a_estoque_utilizavel ON 3a_estoque_utilizavel.id_estoque_utilizavel = 3a_log_vendas.fk_id_estoque_utilizavel \
        INNER JOIN 3a_validade ON 3a_validade.id_validade = 3a_log_vendas.fk_id_validade \
        INNER join 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
        INNER JOIN 3a_area_acesso ON 3a_area_acesso.id_area_acesso = 3a_subtipo_area_autorizada.fk_id_area_acesso \
        INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_area_acesso = 3a_area_acesso.id_area_acesso \
        INNER JOIN 3a_ponto_acesso ON 3a_ponto_acesso.id_ponto_acesso = 3a_porta_acesso.fk_id_ponto_acesso \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + "\
        AND 3a_porta_acesso.id_porta_acesso = " + idPorta + "\
        AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";";

    //log_(sql)

    con.query(sql, function (err, result) {        
        if (err) throw err;              
        
        if(result[0])
            checkTicketValidity(req, res, result)

        else {
            let callback = [{"callback": 4, "result": result}]
            res.json({"success": callback});            
        }
    });
}

function checkTicketValidity(req, res, result){

    let idTotem = req.body.id 
    let ticket = result[0].id_estoque_utilizavel   
    let mesmo_dia_validade = result[0].mesmo_dia_validade
    let infinito_validade = result[0].infinito_validade        

    log_('Totem: '+ idTotem + ' - Verificando ticket validade: ' + ticket)
    
    if(mesmo_dia_validade == 1)
        ticketValiditySameDay(req, res, result)

    else if(infinito_validade == 1)
        ticketValidityInfinite(req, res, result)
    
    else 
        ticketValidityTime(req, res, result)
}

function ticketValiditySameDay(req, res, result){

    let idTotem = req.body.id
    let ticket = result[0].id_estoque_utilizavel   
    let data_log_venda = result[0].data_log_venda
    let now = moment().format()       

    let isSame = moment(data_log_venda).isSame(now, 'day')    
    log_('Totem: '+ idTotem + ' - Verificando ticket validade mesmo dia: ' + ticket)    

    if(isSame)
        checkDoorRules(req, res, result)    

    else {
        let callback = [{"callback": 5, "result": result}]
        res.json({"success": callback});            
    }
}

function ticketValidityInfinite(req, res, result){
    let idTotem = req.body.id        
    let ticket = result[0].id_estoque_utilizavel

    log_('Totem: '+ idTotem + ' - Verificando ticket validade infinita: ' + ticket)

    checkDoorRules(req, res, result)
}

function ticketValidityTime(req, res, result){

    let idTotem = req.body.id
    let ticket = result[0].id_estoque_utilizavel           

    let tempo_validade = ticket.tempo_validade
    this.statusTicketStart = moment(ticket.data_log_venda).format("L")    
    let until =  moment(ticket.data_log_venda).hours(tempo_validade).format();
    let now = moment().format()        
    let isAfter = moment(until).isAfter(now);

    log_('Totem: '+ idTotem + ' - Verificando ticket validade tempo: ' + ticket)

    if(isAfter)
        checkDoorRules(req, res, result)    

    else {
        let callback = [{"callback": 6, "result": result}]
        res.json({"success": callback});            
    }
}

function checkDoorRules(req, res, result){

    let ticket = result[0].id_estoque_utilizavel   
    let idTotem = req.body.id 
    log_('Totem: '+ idTotem + ' - Verificando regras das portas: ', ticket)           

    let horas_porta_acesso = result[0].horas_porta_acesso
    let mesmo_dia_porta_acesso = result[0].mesmo_dia_porta_acesso
    let unica_porta_acesso = result[0].unica_porta_acesso
    let numero_liberacoes = result[0].numero_liberacoes

    log_("Regras horas porta acesso: " + horas_porta_acesso)
    log_("Regras mesmo dia porta acesso: " + mesmo_dia_porta_acesso)
    log_("Regras acesso único: " + unica_porta_acesso)
    log_("Regras número de liberações: " + numero_liberacoes)

    if(horas_porta_acesso > 0){
      ticketAccessTimeDoor(req, res, result)
    }
    else if(mesmo_dia_porta_acesso > 0){
      ticketAccessSameDay(req, res, result)
    }
    else if(unica_porta_acesso > 0){
      ticketAccessOnlyone(req, res, result)
    }
    else if(numero_liberacoes > 0){
      ticketAccessCountPass(req, res, result)
    }    
    else {      
      let callback = [{"callback": 7, "result": result}]
      res.json({"success": callback}); 
    }
}

function ticketAccessTimeDoor(req, res, result){

    let ticket = result[0].id_estoque_utilizavel   
    let idTotem = req.body.id       
    log_('Totem: '+ idTotem + ' - Verificando regras das portas Tempo: ', ticket)           

    let until =  moment(result[0].data_log_venda).add(result[0].horas_porta_acesso, 'hours').format();
    let now = moment().format()        
    
    let isAfter = moment(until).isAfter(now);

    if(isAfter){
      useTicket(req, res, result)

    } else {
        let callback = [{"callback": 8, "result": result}]
        res.json({"success": callback});
    } 
}

function ticketAccessSameDay(req, res, result){

    let ticket = result[0].id_estoque_utilizavel   
    let idTotem = req.body.id          
    log_('Totem: '+ idTotem + ' - Verificando regras das portas Mesmo dia: ', ticket)       

    let until =  moment(ticket.data_log_venda).format();
    let now = moment().format()                  
    let isSame = moment(until).isSame(now, 'day');    

    if(isSame){

      useTicket(req, res, result)

    } else {

      let callback = [{"callback": 9, "result": result}]
      res.json({"success": callback});
    }
}

function ticketAccessOnlyone(req, res, result){

    let ticket = result[0].id_estoque_utilizavel           
    let idArea = req.body.idArea
    let idPorta = req.body.idPorta
    let idTotem = req.body.id
        
    log_('Totem: '+ idTotem + ' - Verificando regras das portas acesso único: ', ticket)       

    let sql = "SELECT 3a_log_utilizacao.data_log_utilizacao,\
            3a_estoque_utilizavel.id_estoque_utilizavel,\
            3a_porta_acesso.*,\
            3a_tipo_produto.*,\
            3a_ponto_acesso.nome_ponto_acesso \
            FROM 3a_log_utilizacao \
        INNER JOIN 3a_ponto_acesso ON 3a_ponto_acesso.id_ponto_acesso = 3a_log_utilizacao.fk_id_ponto_acesso \
        INNER JOIN 3a_estoque_utilizavel ON 3a_estoque_utilizavel.id_estoque_utilizavel = 3a_log_utilizacao.fk_id_estoque_utilizavel \
        INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
        INNER JOIN 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
        INNER JOIN 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
        INNER JOIN 3a_tipo_produto ON 3a_tipo_produto.id_tipo_produto = 3a_produto.fk_id_tipo_produto \
        INNER JOIN 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
        INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_ponto_acesso = 3a_ponto_acesso.id_ponto_acesso \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + " \
        AND 3a_porta_acesso.id_porta_acesso = " + idPorta + " \
        AND 3a_ponto_acesso.id_ponto_acesso = " + idTotem + " \
        AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";";

    //log_(sql)

    con.query(sql, function (err1, result1) {        
        if (err1) throw err1;   
        
        if(result1.length == 0)
            useTicket(req, res, result)
        
        else {

            let callback = [{"callback": 10, "result": result1}]
            res.json({"success": callback});
        }                
    });
}

function ticketAccessCountPass(req, res, result){

    let ticket = result[0].id_estoque_utilizavel               
    let numero_liberacoes = result[0].numero_liberacoes
    let idArea = req.body.idArea
    let idPorta = req.body.idPorta
    let idTotem = req.body.id
    
    log_('Totem: '+ idTotem + ' - Verificando regras acesso contado: ', ticket)       

    let sql = "SELECT COUNT(3a_log_utilizacao.data_log_utilizacao) AS TOTAL, \
            3a_ponto_acesso.nome_ponto_acesso \
            FROM 3a_log_utilizacao \
            INNER JOIN 3a_ponto_acesso ON 3a_ponto_acesso.id_ponto_acesso = 3a_log_utilizacao.fk_id_ponto_acesso \
            INNER JOIN 3a_estoque_utilizavel ON 3a_estoque_utilizavel.id_estoque_utilizavel = 3a_log_utilizacao.fk_id_estoque_utilizavel \
            INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
            INNER JOIN 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
            INNER JOIN 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
            INNER JOIN 3a_tipo_produto ON 3a_tipo_produto.id_tipo_produto = 3a_produto.fk_id_tipo_produto \
            INNER JOIN 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
            INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_ponto_acesso = 3a_ponto_acesso.id_ponto_acesso \
            WHERE 3a_log_utilizacao.fk_id_estoque_utilizavel = " + ticket + "\
            AND 3a_ponto_acesso.id_ponto_acesso = " + idTotem + " \
            AND 3a_porta_acesso.id_porta_acesso = " + idPorta + " \
            AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";"

    log_(sql)

    con.query(sql, function (err1, result1) {        
        if (err1) throw err1;           
        
        if(result1.length == 0)
            useTicket(req, res, result)

        else {

            let total = result1[0].TOTAL       

            if(total < numero_liberacoes)
                useTicket(req, res, result)
                
             else {

                let callback = [{"callback": 11, "result": result}]
                res.json({"success": callback});
             }                
        }             
    });    
}

function useTicket(req, res, result){

    let ticket = result[0].id_estoque_utilizavel   
    let idTotem = req.body.id            
    log_('Totem: '+ idTotem + ' - Utilizando ingresso: ', ticket)

    let callback = [{"callback": 100, "result": result}]
    res.json({"success": callback});
}

function ticketInfo(req, res){

    let idArea = req.body.idArea
    let idPorta = req.body.idPorta
    let ticket = req.body.ticket

    let sql = "SELECT * \
                FROM 3a_estoque_utilizavel \
            INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
            INNER join 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
            INNER join 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
            INNER join 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
            INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_area_acesso = 3a_subtipo_area_autorizada.fk_id_area_acesso \
            WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + " \
            AND 3a_porta_acesso.id_porta_acesso = " + idPorta + " \
            AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";"

    //log_(sql)

    con.query(sql, function (err1, result1) {        
        if (err1) throw err1;           
        res.json({"success": result1}); 
    });
}

app.post('/activeGpioSuccess', function(req, res) {
    blinkSuccess()    
    res.json({"success": "1"});
});

app.post('/activeGpioError', function(req, res) {
    blinkError()
    res.json({"success": "1"});    
});

app.post('/getAreas', function(req, res) {

    let idTotem = req.body.id

    if(idTotem == 0){
        res.json({"success": false}); 
    }        
    else {

        log_('Totem: '+ idTotem + ' - Verificando todas as areas:')
            
        let sql = "SELECT \
        3a_area_acesso.id_area_acesso,\
        3a_area_acesso.nome_area_acesso,\
        3a_area_acesso.lotacao_area_acesso,\
        3a_area_acesso.ativo \
        FROM \
        3a_area_acesso";

        con.query(sql, function (err1, result) {        
            if (err1) throw err1;           
            res.json({"success": result}); 
        });
    }    
});

app.post('/getAreaInfo', function(req, res) {

    let idTotem = req.body.id
    let idArea_ = req.body.idArea

    log_('Totem: '+ idTotem + ' - Verificando informações da area: ' + idArea_)
            
    let sql = "SELECT \
    3a_area_acesso.id_area_acesso,\
    3a_area_acesso.nome_area_acesso,\
    3a_area_acesso.lotacao_area_acesso,\
    3a_area_acesso.ativo \
    FROM \
    3a_area_acesso \
    WHERE 3a_area_acesso.id_area_acesso = " + idArea_ + ";";

    //log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/getAreaCounter', function(req, res) {

    let idTotem = req.body.id
    let idArea = req.body.idArea    

    log_('Totem: '+ idTotem + ' - Verificando contador da area:', idArea)
            
    let sql = "SELECT \
    3a_area_acesso.id_area_acesso,\
    3a_area_acesso.nome_area_acesso,\
    3a_area_acesso.lotacao_area_acesso,\
    3a_area_acesso.ativo \
    FROM \
    3a_area_acesso \
    WHERE 3a_area_acesso.id_area_acesso = " + idArea + ";"    

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/incrementAreaCounter', function(req, res) {

    let idTotem = req.body.id
    let idArea = req.body.idArea

    log_('Totem: '+ idTotem + ' - Incrementando contador da area:', idArea)
            
    let sql = "UPDATE \
    3a_area_acesso \
    SET 3a_area_acesso.lotacao_area_acesso = 3a_area_acesso.lotacao_area_acesso + 1 \
    WHERE 3a_area_acesso.id_area_acesso = " + idArea + ";"

   //log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/decrementAreaCounter', function(req, res) {

    let idTotem = req.body.id
    let idArea = req.body.idArea

    log_('Totem: '+ idTotem + ' - Decrementando contador da area:', idArea)
            
    let sql = "UPDATE \
    3a_area_acesso \
    SET 3a_area_acesso.lotacao_area_acesso = 3a_area_acesso.lotacao_area_acesso - 1 \
    WHERE 3a_area_acesso.id_area_acesso = " + idArea + ";"

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/checkTicketExist', function(req, res) {
    checkTicketExists(req, res)
});

app.post('/checkTicketQuick', function(req, res) {

    let idTotem = req.body.id    
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket rápido:', ticket)

    if(ticket.length <= 0){
        let array = []
        res.json({"success": array}); 

    } else {

        let sql = "SELECT * \
            FROM  3a_estoque_utilizavel \
        INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
        INNER join 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
        INNER join 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
        INNER join 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
        INNER JOIN 3a_area_acesso ON 3a_area_acesso.id_area_acesso = 3a_subtipo_area_autorizada.fk_id_area_acesso \
        INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_area_acesso = 3a_area_acesso.id_area_acesso \
        INNER JOIN 3a_ponto_acesso ON 3a_ponto_acesso.id_ponto_acesso = 3a_porta_acesso.fk_id_ponto_acesso \
        INNER JOIN 3a_validade ON 3a_validade.id_validade = 3a_log_vendas.fk_id_validade \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

        //log_(sql)

        con.query(sql, function (err1, result) {        
            if (err1) throw err1;           
            res.json({"success": result}); 
        });
    }                
});

app.post('/useTicket', function(req, res) {
    
    let idTotem = req.body.id
    let idArea = req.body.idArea
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Marcando ticket como utilizado:', ticket, idArea)

    let sql1 = "INSERT INTO 3a_log_utilizacao \
            (3a_log_utilizacao.fk_id_estoque_utilizavel,\
             3a_log_utilizacao.fk_id_ponto_acesso,\
             3a_log_utilizacao.fk_id_area_acesso,\
             3a_log_utilizacao.fk_id_usuario,data_log_utilizacao) \
            VALUES (" + ticket + "," + idTotem + "," + idArea + ", 1, NOW());";        

        //log_(sql1)

        con.query(sql1, function (err1, result) {        

            if (err1) throw err1;          
            
            let sql_utilizacao = "UPDATE 3a_estoque_utilizavel \
                    SET 3a_estoque_utilizavel.utilizado = 1 \
                    WHERE id_estoque_utilizavel = " + ticket + " LIMIT 1;"

            //log_(sql_utilizacao)

            con.query(sql_utilizacao, function (err2, result2) {        
                if (err2) throw err2;          
                
                ticketInfo(req, res)
            });        
        });                        
});

app.post('/checkMultipleTickets', function(req, res) {

    let idTotem = req.body.id
    let ticketStart = req.body.ticketStart
    let ticketEnd = req.body.ticketEnd

    log_('Totem: '+ idTotem + ' - Verificando vários ticket:', ticketStart, ticketEnd)

    let sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel, false AS MODIFICADO,\
            3a_log_vendas.data_log_venda \
            FROM 3a_estoque_utilizavel \
        LEFT JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel BETWEEN " + ticketStart + " AND "+ ticketEnd + ";"

    log_(sql)   

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;   
        res.json({"success": result});  
    });              
});

app.post('/getTotemInfo', function(req, res) {    
    
    let sql;

    Object.keys(ifaces).forEach(function (ifname) {
      
        ifaces[ifname].forEach(function (iface) {
          
          if ('IPv4' !== iface.family || iface.internal !== false) {
            return;
          }

          address = iface.address

          if(address.indexOf("10.8.0.") > -1){
              return;
          }

          if(address)
            sql = "SELECT 3a_ponto_acesso.*,\
                    3a_porta_acesso.*,\
                    3a_area_acesso.* \
                FROM 3a_ponto_acesso \
                INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_ponto_acesso = 3a_ponto_acesso.id_ponto_acesso \
                INNER JOIN 3a_area_acesso ON 3a_area_acesso.id_area_acesso = 3a_porta_acesso.fk_id_area_acesso \
                WHERE ip_ponto_acesso = '" + address + "';"                                                   
        });
      }); 
      
    //log_(sql)   

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;   
        res.json({"success": result});               
    }); 
});

app.post('/checkTicketExistMultiple', function(req, res) {

    let idTotem = req.body.id    
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando se ticket existe:', ticket)

    let sql = "SELECT * FROM 3a_estoque_utilizavel WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

    //log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/checkTicketIsSold', function(req, res) {

    let idTotem = req.body.id
    let ticket = req.body.ticket    

    log_('Totem: '+ idTotem + ' - Verificando ticket vendido:', ticket)    

    let sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel,\
            3a_log_vendas.data_log_venda \
            FROM 3a_estoque_utilizavel \
        LEFT JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

        log_(sql)

        con.query(sql, function (err1, result) {        
            if (err1) throw err1;                   
            res.json({"success": result});     
        });   
});

app.post('/checkTicketMultiple', function(req, res) {

    let idTotem = req.body.id
    let idArea = req.body.idArea
    let idPorta = req.body.idPorta
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket:', ticket)

    let sql = "SELECT * \
                FROM 3a_estoque_utilizavel \
            INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
            INNER join 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
            INNER join 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
            INNER join 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
            INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_area_acesso = 3a_subtipo_area_autorizada.fk_id_area_acesso \
            WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + " \
            AND 3a_porta_acesso.id_porta_acesso = " + idPorta + " \
            AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";"

    //log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/checkTicketContinueMultiple', function(req, res) {

    let idTotem = req.body.id    
    let ticket = req.body.ticket
    let idPorta = req.body.idPorta
    let idArea = req.body.idArea

    log_('Totem: '+ idTotem + ' - Verificando ticket continuação:', ticket, idPorta, idArea)

    let sql = "SELECT 3a_log_vendas.data_log_venda,\
            3a_estoque_utilizavel.id_estoque_utilizavel,\
            3a_estoque_utilizavel.utilizado,\
            3a_produto.nome_produto,\
            3a_tipo_produto.nome_tipo_produto, \
            3a_porta_acesso.*,\
            3a_validade.* \
            FROM 3a_log_vendas \
        INNER JOIN 3a_produto ON 3a_produto.id_produto = 3a_log_vendas.fk_id_produto \
        INNER join 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
        INNER JOIN 3a_tipo_produto ON 3a_tipo_produto.id_tipo_produto = 3a_produto.fk_id_tipo_produto \
        INNER JOIN 3a_estoque_utilizavel ON 3a_estoque_utilizavel.id_estoque_utilizavel = 3a_log_vendas.fk_id_estoque_utilizavel \
        INNER JOIN 3a_validade ON 3a_validade.id_validade = 3a_log_vendas.fk_id_validade \
        INNER join 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
        INNER JOIN 3a_area_acesso ON 3a_area_acesso.id_area_acesso = 3a_subtipo_area_autorizada.fk_id_area_acesso \
        INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_area_acesso = 3a_area_acesso.id_area_acesso \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + "\
        AND 3a_porta_acesso.id_porta_acesso = " + idPorta + "\
        AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";";

    //log_(sql)

    con.query(sql, function (err1, result1) {        
        if (err1) throw err1;              
        res.json({"success": result1}); 
    });               
});

app.post('/useTicketMultiple', function(req, res) {
    
    let idTotem = req.body.id
    let idArea = req.body.idArea
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Marcando ticket como utilizado:', ticket, idArea)

    let sql1 = "INSERT INTO 3a_log_utilizacao \
            (3a_log_utilizacao.fk_id_estoque_utilizavel,\
             3a_log_utilizacao.fk_id_ponto_acesso,\
             3a_log_utilizacao.fk_id_area_acesso,\
             3a_log_utilizacao.fk_id_usuario,data_log_utilizacao) \
            VALUES (" + ticket + "," + idTotem + "," + idArea + ", 1, NOW());";        

        //log_(sql1)

        con.query(sql1, function (err1, result) {        

            if (err1) throw err1;          
            
            let sql_utilizacao = "UPDATE 3a_estoque_utilizavel \
                    SET 3a_estoque_utilizavel.utilizado = 1 \
                    WHERE id_estoque_utilizavel = " + ticket + " LIMIT 1;"

            log_(sql_utilizacao)

            con.query(sql_utilizacao, function (err2, result2) {        
                if (err2) throw err2;          
                res.json({"success": result}); 
            });        
        });              
});

app.post('/checkTicketUsed', function(req, res) {
    let idTotem = req.body.id
    let ticket = req.body.ticket
    let idArea = req.body.idArea
    let idPorta = req.body.idPorta

    log_('Totem: '+ idTotem + ' - Verificando ticket:', ticket)

    let sql = "SELECT 3a_log_utilizacao.data_log_utilizacao,\
            3a_estoque_utilizavel.id_estoque_utilizavel,\
            3a_porta_acesso.*,\
            3a_tipo_produto.*,\
            3a_ponto_acesso.nome_ponto_acesso \
            FROM 3a_log_utilizacao \
        INNER JOIN 3a_ponto_acesso ON 3a_ponto_acesso.id_ponto_acesso = 3a_log_utilizacao.fk_id_ponto_acesso \
        INNER JOIN 3a_estoque_utilizavel ON 3a_estoque_utilizavel.id_estoque_utilizavel = 3a_log_utilizacao.fk_id_estoque_utilizavel \
        INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
        INNER JOIN 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
        INNER JOIN 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
        INNER JOIN 3a_tipo_produto ON 3a_tipo_produto.id_tipo_produto = 3a_produto.fk_id_tipo_produto \
        INNER JOIN 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
        INNER JOIN 3a_porta_acesso ON 3a_porta_acesso.fk_id_ponto_acesso = 3a_ponto_acesso.id_ponto_acesso \
        WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + "\
        AND 3a_porta_acesso.id_porta_acesso = " + idPorta + "\
        AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";";

        //log_(sql)

        con.query(sql, function (err1, result) {        
            if (err1) throw err1;           
            res.json({"success": result, "data": req.body}); 
        });            
});


http.listen(8085);

