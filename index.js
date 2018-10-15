let mysql = require('mysql');
let express =  require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let bodyParser = require('body-parser');
let logger = require('morgan');
let methodOverride = require('method-override')
let cors = require('cors');
let shell = require('shelljs');
var fs = require("fs");
var os = require('os');
var ifaces = os.networkInterfaces();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(cors());

let con = mysql.createConnection({
    host: "192.168.0.20",
    user: "totem",
    password: "totem",
    database: "3a_access",
    timezone: 'utc'
 });

 con.connect(function(err) {
    if (err) throw err;
	log_("Database conectado!")		    
    log_("Aguardando conexões ...")	

    startGpios()
});

function log_(str){
    console.log(str)
}

function startGpios(){
    log_("Iniciando GPIOs...")	

    shell.exec('echo "2" > /sys/class/gpio/unexport', {silent:true});						
    shell.exec('echo "2" > /sys/class/gpio/export', {silent:true});										        
    shell.exec('echo "out" > /sys/class/gpio/gpio2/direction', {silent:true});	    

    shell.exec('echo "3" > /sys/class/gpio/unexport', {silent:true});						
    shell.exec('echo "3" > /sys/class/gpio/export', {silent:true});										        
    shell.exec('echo "out" > /sys/class/gpio/gpio3/direction', {silent:true});	    

    shell.exec('echo "4" > /sys/class/gpio/unexport', {silent:true});						
    shell.exec('echo "4" > /sys/class/gpio/export', {silent:true});										        
    shell.exec('echo "out" > /sys/class/gpio/gpio4/direction', {silent:true});	    

    watchGpios()
}

function watchGpios(){
    log_("Configurando GPIOs")

    fs.watch('/sys/class/gpio/gpio2/value', { persistent: true }, function (event_, fileName) {
        console.log('gpio2-changed', fileName, event_)
        io.emit('gpio2', {gpio: '2', event: event_});   
    });

    fs.watch('/sys/class/gpio/gpio3/value', { persistent: true }, function (event_, fileName) {
        console.log('gpio3-changed', fileName, event_)
        io.emit('gpio3', {gpio: '3', event: event_});   
    });

    fs.watch('/sys/class/gpio/gpio4/value', { persistent: true }, function (event_, fileName) {
        console.log('gpio4-changed', fileName, event_)
        io.emit('gpio4', {gpio: '4', event: event_});   
    });

    log_("GPIOs configuradas")
}

app.post('/getAreas', function(req, res) {

    let idTotem = req.body.id

    if(idTotem == 0)
        res.json({"success": false}); 

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

    log_(sql)

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

   log_(sql)

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


app.post('/checkTicketAreaAccess', function(req, res) {
    
    let idTotem = req.body.idTotem
    let idArea = req.body.idArea
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket acesso:', ticket)
    
    let sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel,\
    3a_produto.nome_produto,\
    3a_subtipo_produto.nome_subtipo_produto \
    FROM 3a_estoque_utilizavel \
    INNER JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
    INNER JOIN 3a_produto ON 3a_produto.id_produto = 3a_log_vendas.fk_id_produto \
    INNER JOIN 3a_subtipo_produto ON 3a_subtipo_produto.id_subtipo_produto = 3a_log_vendas.fk_id_subtipo_produto \
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

app.post('/checkTicketExist', function(req, res) {

    let idTotem = req.body.id    
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando se ticket existe:', ticket)
            
    let sql = "SELECT * FROM 3a_estoque_utilizavel WHERE 3a_estoque_utilizavel.id_estoque_utilizavel = " + ticket + ";"

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/checkTicket', function(req, res) {

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

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/checkTicketQuick', function(req, res) {

    let idTotem = req.body.id    
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket rápido:', ticket)
            
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

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/checkTicketContinue', function(req, res) {

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

   log_(sql)

    con.query(sql, function (err1, result1) {        
        if (err1) throw err1;      
        
        console.log(result1)


        res.json({"success": result1}); 
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

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result, "data": req.body}); 
    });
});

app.post('/checkTicketUsedTotal', function(req, res) {

    let idTotem = req.body.id
    let ticket = req.body.ticket

    log_('Totem: '+ idTotem + ' - Verificando ticket:', ticket)
            
    let sql = "SELECT COUNT(3a_log_utilizacao.data_log_utilizacao) AS TOTAL FROM 3a_log_utilizacao \
        WHERE 3a_log_utilizacao.fk_id_estoque_utilizavel = " + ticket + ";"

   log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result, "data": req.body}); 
    });
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

   log_(sql1)

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

app.post('/checkMultipleTickets', function(req, res) {

    let idTotem = req.body.id
    let ticketStart = req.body.ticketStart
    let ticketEnd = req.body.ticketEnd

    log_('Totem: '+ idTotem + ' - Verificando vários ticket:', ticketStart, ticketEnd)

    let sql = "SELECT 3a_estoque_utilizavel.id_estoque_utilizavel, false AS MODIFICADO,\
        3a_ponto_acesso.nome_ponto_acesso,\
        3a_log_vendas.data_log_venda \
        FROM 3a_estoque_utilizavel \
    LEFT JOIN 3a_log_vendas ON 3a_log_vendas.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
    LEFT JOIN 3a_log_utilizacao ON 3a_log_utilizacao.fk_id_estoque_utilizavel = 3a_estoque_utilizavel.id_estoque_utilizavel \
    LEFT JOIN 3a_ponto_acesso ON 3a_ponto_acesso.id_ponto_acesso = 3a_log_utilizacao.fk_id_ponto_acesso \
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
      
    log_(sql)   

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;   
        res.json({"success": result});               
    }); 
});

http.listen(8085);
