const express = require('express')
const session = require('express-session')
const handlebars = require('express-handlebars')
const app = express()
const http = require('http')
const server = http.Server(app)
const io = require('socket.io')(server)
const normalize = require('normalizr').normalize
const schema = require('normalizr').schema
const productos = require('./api/productos')
const Mensajes = require('./api/mensajes')
const passport = require('passport')
const FacebookStrategy = require('passport-local').Strategy
const User = require('./models/users')
const dotenv = require('dotenv')
const { fork } = require('child_process')
const numCPUs = require('os').cpus().length

require('./database/connection')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}))
app.use(express.static('public'))

let FACEBOOK_CLIENT_ID = " "
let FACEBOOK_CLIENT_SECRET = " "

if (process.argv[3] && process.argv[4]) {
    FACEBOOK_CLIENT_ID = process.argv[3];
    FACEBOOK_CLIENT_SECRET = process.argv[4];
} else {
    console.log('No se ingresaron los valores correctamente. Se procede a usar valores por defecto')
    FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
    FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
}

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_CLIENT_ID,
    clientSecret: FACEBOOK_CLIENT_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'photos', 'emails'],
    scope: ['email']
}, function (accessToken, refreshToken, profile, done) {
    let userProfile = profile._json;
    console.log(userProfile);
    return done(null, userProfile);
}))

passport.serializeUser(function (user, done) {
    done(null, user);
})

passport.deserializeUser(function (user, done) {
    done(null, user);
})

app.get('/info', (req, res) => {
    let informacion = {}
    informacion['Argumentos de entrada:'] = `${process.argv[2]} ${process.argv[3]} ${process.argv[4]}`
    informacion['Nombre de plataforma:'] = process.platform
    informacion['Version de Node:'] = process.version
    informacion['Uso de memoria:'] = process.memoryUsage()
    informacion['Path de ejecucion:'] = process.execPath
    informacion['Process id:'] = process.pid
    informacion['Carpeta corriente:'] = process.cwd()
    informacion['Numero de procesadores'] = numCPUs
    res.send(JSON.stringify(informacion, null, 4))
})

app.get('/random', (req, res) => {
    const numeroRandom = fork('./api/numeroRandom.js')
    let cantidad = 0
    if (req.query.cant) {
        cantidad = req.query.cant
    } else {
        cantidad = 100000000
    }
    numeroRandom.send((cantidad).toString())
    numeroRandom.on("message", obj => {
        res.end(JSON.stringify(obj, null, 3))
    })
})

//

app.use(passport.initialize())
app.use(passport.session())

app.use((err, req, res, next) =>{
    console.error(err.message)
    return res.status(500).send('Algo se rompió!!')
})

app.engine('hbs', handlebars({
    extname: '.hbs',
    defaultLayout: 'index.hbs',
    layoutsDir: __dirname + '/views/layouts'
}))

app.set("view engine", "hbs")
app.set("views", "./views")

app.get('/auth/facebook', passport.authenticate('facebook'))

app.get('/auth/facebook/callback', passport.authenticate('facebook',
    {
        successRedirect: '/login',
        failureRedirect: '/faillogin'
    }
))

app.get('/login', (req, res) => {
    res.render('vista', {
        showLogin: false,
        showContent: true,
        bienvenida: req.user.name,
        email: req.user.email,
        urlImg: req.user.picture.data.url,
        showBienvenida: true
    })
})

app.get('/faillogin', (req, res) => {
    res.sendFile(__dirname + '/public/failLogin.html')
})

app.get('/logout', (req, res) => {
    req.logout();
    res.sendFile(__dirname + '/public/logout.html')
})

const productosRouter = require('./routes/productosRouter')
app.use('/api', productosRouter)
const mensajesRouter = require('./routes/mensajesRouter')
app.use('/api', mensajesRouter)

io.on('connection', async socket => {
    console.log('Usuario conectado')

    socket.on('nuevo-producto', nuevoProducto => {
        console.log(nuevoProducto)
        productos.guardar(nuevoProducto)
    })
    socket.emit('guardar-productos', () => {
        socket.on('notificacion', data => {
            console.log(data)
        })
    })

    socket.on("new-message", async function (data) {

        await Mensajes.guardar(data)

        let mensajesDB = await Mensajes.buscarTodo()     

        const autorSchema = new schema.Entity('autor', {}, { idAttribute: 'nombre' });

        const mensajeSchema = new schema.Entity('texto', {
            autor: autorSchema
        }, { idAttribute: '_id' })

        const mensajesSchema = new schema.Entity('mensajes', {
            msjs: [mensajeSchema]
        }, {idAttribute: 'id'})

        const mensajesNormalizados = normalize(mensajesDB, mensajesSchema)
        const messages = []
        messages.push(mensajesDB);

        console.log(mensajesDB)

        console.log(mensajesNormalizados)
            
        io.sockets.emit("messages", mensajesNormalizados)
    })
})

let PORT = 0
if(process.argv[2] && !isNaN(process.argv[2])) {
    PORT = process.argv[2]
} else if (isNaN(process.argv[2])) {
    console.log('No se ingreso un puerto valido, se usara el puerto 8080')
    PORT = 8080
}

const svr = server.listen(PORT, () => {
    console.log(`servidor escuchando en http://localhost:${PORT}`)
})

server.on('error', error => {
    console.log('error en el servidor:', error)
})