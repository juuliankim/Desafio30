const express = require('express')
const router = express.Router()
const Mensajes = require('../api/mensajes')

router.get('/leer', async (req, res) => {
    try {
        let result = await Mensajes.buscar()
        return res.json(result)
    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
})

router.get('/leer/:id', async (req, res) => {
    try {
        let result = await Mensajes.buscarPorId(req.params.id)
        return res.json(result)
    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
})

router.post('/guardar', async (req, res) => {
    try {
        let result = await Mensajes.guardar(req.body)
        return res.json(result)
    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
})

router.put('/actualizar/:id', async (req, res) => {
    try {
        let result = await Mensajes.actualizar(req.params.id, req.body)
        return res.json(result)
    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
})

router.delete('/borrar/:id', async (req, res) => {
    try {
        let result = await Mensajes.borrar(req.params.id)
        return res.json(result)
    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
})

module.exports = router