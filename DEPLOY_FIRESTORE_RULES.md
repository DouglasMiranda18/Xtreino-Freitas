# Deploy das Regras do Firestore

## ⚠️ IMPORTANTE: As regras do Firestore precisam ser deployadas manualmente!

### Como fazer o deploy:

1. **Acesse o Firebase Console:**
   - Vá para: https://console.firebase.google.com/
   - Selecione o projeto X-TREINO FREITAS

2. **Navegue para Firestore:**
   - No menu lateral, clique em "Firestore Database"
   - Clique na aba "Rules"

3. **Substitua as regras:**
   - Copie todo o conteúdo do arquivo `firestore.rules`
   - Cole no editor de regras do Firebase Console
   - Clique em "Publish" (Publicar)

### Regras que foram adicionadas:

```javascript
// adminHistory: leitura para staff (admin/gerente/sócio); escrita apenas para admins autorizados
match /adminHistory/{historyId} {
  allow read: if isAdmin() || isGerente() || isSocio();
  allow create, update, delete: if isAuthorizedAdmin();
}
```

### Verificações necessárias:

- ✅ **users:** Leitura para staff (admin/gerente/vendedor/design/sócio)
- ✅ **orders:** Leitura para staff e próprio usuário
- ✅ **registrations:** Leitura para staff e próprio usuário
- ✅ **adminHistory:** Leitura para staff (admin/gerente/sócio)

### Após o deploy:

1. **Teste o login** no admin
2. **Verifique se não há mais erros** de permissões no console
3. **Teste as funcionalidades** de tokens e histórico

### Se ainda houver problemas:

- Verifique se o usuário está autenticado
- Verifique se o cargo está correto no Firestore
- Verifique se o email está na lista de emails autorizados (para admin/ceo/gerente/vendedor)
