var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var methodOverride = require('method-override')
var cors = require('cors');
var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(cors());

var con = mysql.createConnection({
    host: "10.8.0.50",
    user: "root",
    password: "Mudaragora00"
 });

 con.connect(function(err) {
    if (err) throw err;
	log_("Database conectado!")		    
	log_("Aguardando conexões ...")	
});

function log_(str){
    console.log(str)
}

function updateTicketAsUsed(ticket){
         
    var sql = "UPDATE zoosp.3a_estoque_utilizavel \
                SET zoosp.3a_estoque_utilizavel.utilizado = 1 \
                WHERE id_estoque_utilizavel = " + ticket + " LIMIT 1;"

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;  
        
        return true
    });
}

function useTicket_(req){
    
    var idTotem = req.body.id
    var idAreaAcesso = req.body.idAreaAcesso
    var ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Marcando ticket como utilizado:', ticket, idAreaAcesso)
            
    var sql = "INSERT INTO zoosp.3a_log_utilizacao \
            (zoosp.3a_log_utilizacao.fk_id_estoque_utilizavel, \
             zoosp.3a_log_utilizacao.fk_id_ponto_acesso, \
             zoosp.3a_log_utilizacao.fk_id_area_acesso, \
             zoosp.3a_log_utilizacao.fk_id_usuario,data_log_utilizacao) \
            VALUES (" + ticket + "," + idTotem + "," + idAreaAcesso + ", 1, NOW());"

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;          
        
        let removeStock = updateTicketAsUsed(ticket)
        return removeStock
    });
}

app.post('/getAreas', function(req, res) {

    var idTotem = req.body.id

    log_('Totem: '+ idTotem + ' - Verificando todas as areas:')
            
    var sql = "SELECT \
    zoosp.3a_area_acesso.id_area_acesso,\
    zoosp.3a_area_acesso.nome_area_acesso,\
    zoosp.3a_area_acesso.lotacao_area_acesso,\
    zoosp.3a_area_acesso.ativo \
    FROM \
    zoosp.3a_area_acesso";

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/getAreaCounter', function(req, res) {

    var idTotem = req.body.id
    var idArea = req.body.idArea    

    log_('Totem: '+ idTotem + ' - Verificando contador da area:', idArea)
            
    var sql = "SELECT \
    zoosp.3a_area_acesso.id_area_acesso,\
    zoosp.3a_area_acesso.nome_area_acesso,\
    zoosp.3a_area_acesso.lotacao_area_acesso,\
    zoosp.3a_area_acesso.ativo \
    FROM \
    zoosp.3a_area_acesso \
    WHERE zoosp.3a_area_acesso.id_area_acesso = " + idArea + ";"    

    console.log(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/incrementAreaCounter', function(req, res) {

    var idTotem = req.body.id
    var idArea = req.body.idArea

    log_('Totem: '+ idTotem + ' - Incrementando contador da area:', idArea)
            
    var sql = "UPDATE \
    zoosp.3a_area_acesso \
    SET zoosp.3a_area_acesso.lotacao_area_acesso = zoosp.3a_area_acesso.lotacao_area_acesso + 1 \
    WHERE zoosp.3a_area_acesso.id_area_acesso = " + idArea + ";"

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/decrementAreaCounter', function(req, res) {

    var idTotem = req.body.id
    var idArea = req.body.idArea

    log_('Totem: '+ idTotem + ' - Decrementando contador da area:', idArea)
            
    var sql = "UPDATE \
    zoosp.3a_area_acesso \
    SET zoosp.3a_area_acesso.lotacao_area_acesso = zoosp.3a_area_acesso.lotacao_area_acesso - 1 \
    WHERE zoosp.3a_area_acesso.id_area_acesso = " + idArea + ";"

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/checkTicketIsSold', function(req, res) {

    var idTotem = req.body.id
    var ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket vendido:', ticket)
    
    var sql = "SELECT zoosp.3a_estoque_utilizavel.id_estoque_utilizavel,\
        zoosp.3a_log_vendas.data_log_venda \
        FROM zoosp.3a_estoque_utilizavel \
    LEFT JOIN zoosp.3a_log_vendas ON zoosp.3a_log_vendas.fk_id_estoque_utilizavel = zoosp.3a_estoque_utilizavel.id_estoque_utilizavel \
    WHERE zoosp.3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

    log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;                   
        res.json({"success": result});     
    });    
});

app.post('/checkTicket', function(req, res) {

    var idTotem = req.body.id
    var ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket:', ticket)
            
    var sql = "SELECT zoosp.3a_log_utilizacao.data_log_utilizacao,\
	    zoosp.3a_estoque_utilizavel.id_estoque_utilizavel,\
	    zoosp.3a_ponto_acesso.nome_ponto_acesso \
        FROM zoosp.3a_log_utilizacao \
    INNER JOIN zoosp.3a_ponto_acesso ON zoosp.3a_ponto_acesso.id_ponto_acesso = zoosp.3a_log_utilizacao.fk_id_ponto_acesso \
    INNER JOIN zoosp.3a_estoque_utilizavel ON zoosp.3a_estoque_utilizavel.id_estoque_utilizavel = zoosp.3a_log_utilizacao.fk_id_estoque_utilizavel \
    WHERE zoosp.3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/checkTicketContinue', function(req, res) {

    var idTotem = req.body.id
    var ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket:', ticket)
            
    var sql = "SELECT zoosp.3a_log_vendas.data_log_venda,\
        zoosp.3a_estoque_utilizavel.id_estoque_utilizavel,\
        zoosp.3a_estoque_utilizavel.utilizado,\
        zoosp.3a_produto.nome_produto,\
        zoosp.3a_tipo_produto.nome_tipo_produto, \
        zoosp.3a_validade.*	\
        FROM zoosp.3a_log_vendas \
    INNER JOIN zoosp.3a_produto ON zoosp.3a_produto.id_produto = zoosp.3a_log_vendas.fk_id_produto \
    INNER JOIN zoosp.3a_tipo_produto ON zoosp.3a_tipo_produto.id_tipo_produto = zoosp.3a_produto.fk_id_tipo_produto \
    INNER JOIN zoosp.3a_estoque_utilizavel ON zoosp.3a_estoque_utilizavel.id_estoque_utilizavel = zoosp.3a_log_vendas.fk_id_estoque_utilizavel \
    INNER JOIN zoosp.3a_validade ON zoosp.3a_validade.id_validade = zoosp.3a_log_vendas.fk_id_validade \
    WHERE zoosp.3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/useTicket', function(req, res) {

    let operation = useTicket_(req)            
    res.json({"success": operation});  
});

app.post('/checkMultipleTickets', function(req, res) {

    var idTotem = req.body.id
    var ticketStart = req.body.ticketStart
    var ticketEnd = req.body.ticketEnd

    log_('Totem: '+ idTotem + ' - Verificando vários ticket:', ticketStart, ticketEnd)

    var sql = "SELECT zoosp.3a_estoque_utilizavel.id_estoque_utilizavel,\
        zoosp.3a_log_vendas.data_log_venda \
        FROM zoosp.3a_estoque_utilizavel \
    LEFT JOIN zoosp.3a_log_vendas ON zoosp.3a_log_vendas.fk_id_estoque_utilizavel = zoosp.3a_estoque_utilizavel.id_estoque_utilizavel \
    WHERE zoosp.3a_estoque_utilizavel.id_estoque_utilizavel BETWEEN " + ticketStart + " AND "+ ticketEnd + ";"

   log_(sql)   

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;   
        res.json({"success": result});  
    });            
});

app.listen(8085);
