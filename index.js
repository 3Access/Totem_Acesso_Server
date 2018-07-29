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
    password: "Mudaragora00",
    database: "zoosp"
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
         
    var sql = "UPDATE 3a_estoque_utilizavel \
                SET 3a_estoque_utilizavel.utilizado = 1 \
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
            
    var sql = "INSERT INTO 3a_log_utilizacao \
            (3a_log_utilizacao.fk_id_estoque_utilizavel, \
             3a_log_utilizacao.fk_id_ponto_acesso, \
             3a_log_utilizacao.fk_id_area_acesso, \
             3a_log_utilizacao.fk_id_usuario,data_log_utilizacao) \
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
});

app.post('/getAreaCounter', function(req, res) {

    var idTotem = req.body.id
    var idArea = req.body.idArea    

    log_('Totem: '+ idTotem + ' - Verificando contador da area:', idArea)
            
    var sql = "SELECT \
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

    var idTotem = req.body.id
    var idArea = req.body.idArea

    log_('Totem: '+ idTotem + ' - Incrementando contador da area:', idArea)
            
    var sql = "UPDATE \
    3a_area_acesso \
    SET 3a_area_acesso.lotacao_area_acesso = 3a_area_acesso.lotacao_area_acesso + 1 \
    WHERE 3a_area_acesso.id_area_acesso = " + idArea + ";"

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
    3a_area_acesso \
    SET 3a_area_acesso.lotacao_area_acesso = 3a_area_acesso.lotacao_area_acesso - 1 \
    WHERE 3a_area_acesso.id_area_acesso = " + idArea + ";"

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});


app.post('/checkTicketAreaAccess', function(req, res) {
    
    let idTotem = req.body.idTotem
    let idArea = req.body.idArea
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket acesso:', ticket)
    
    let sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel,\
    3a_produto.nome_produto,\
    3a_subtipo_produto.nome_subtipo_produto \
    FROM 3a_estoque_utilizavel \
    INNER JOIN 3a_produto ON 3a_produto.id_produto = 3a_estoque_utilizavel.fk_id_produto \
    INNER JOIN 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_produto.fk_id_subtipo_produto \
    INNER JOIN 3a_subtipo_area_autorizada ON 3a_subtipo_area_autorizada.fk_id_subtipo = 3a_subtipo_produto.id_subtipo_produto \
    WHERE id_estoque_utilizavel = " + ticket + "\
    AND 3a_subtipo_area_autorizada.fk_id_area_acesso = " + idArea + ";";
    
    log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;                   
        res.json({"success": result});     
    });    
});

app.post('/checkTicketIsSold', function(req, res) {

    var idTotem = req.body.id
    var ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket vendido:', ticket)
    
    var sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel,\
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

app.post('/checkTicket', function(req, res) {

    var idTotem = req.body.id
    var ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket:', ticket)
            
    var sql = "SELECT 3a_log_utilizacao.data_log_utilizacao,\
	    3a_estoque_utilizavel.id_estoque_utilizavel,\
	    3a_ponto_acesso.nome_ponto_acesso \
        FROM 3a_log_utilizacao \
    INNER JOIN 3a_ponto_acesso ON 3a_ponto_acesso.id_ponto_acesso = 3a_log_utilizacao.fk_id_ponto_acesso \
    INNER JOIN 3a_estoque_utilizavel ON 3a_estoque_utilizavel.id_estoque_utilizavel = 3a_log_utilizacao.fk_id_estoque_utilizavel \
    WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

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
            
    var sql = "SELECT 3a_log_vendas.data_log_venda,\
        3a_estoque_utilizavel.id_estoque_utilizavel,\
        3a_estoque_utilizavel.utilizado,\
        3a_produto.nome_produto,\
        3a_tipo_produto.nome_tipo_produto, \
        3a_validade.*	\
        FROM 3a_log_vendas \
    INNER JOIN 3a_produto ON 3a_produto.id_produto = 3a_log_vendas.fk_id_produto \
    INNER JOIN 3a_tipo_produto ON 3a_tipo_produto.id_tipo_produto = 3a_produto.fk_id_tipo_produto \
    INNER JOIN 3a_estoque_utilizavel ON 3a_estoque_utilizavel.id_estoque_utilizavel = 3a_log_vendas.fk_id_estoque_utilizavel \
    INNER JOIN 3a_validade ON 3a_validade.id_validade = 3a_log_vendas.fk_id_validade \
    WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

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

    var sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel,\
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

app.listen(8085);
