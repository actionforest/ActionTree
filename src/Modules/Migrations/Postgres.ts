/**
 * @file Postgres
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project ActionTree
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

export const PgMigrationTemplate = (tablePrefix) => {

  return `// Generated file do not hand edit.
  
  const onUpdateTrigger = table => \`
    CREATE TRIGGER \${table}_updated_at
    BEFORE UPDATE ON \${table}
    FOR EACH ROW
    EXECUTE PROCEDURE on_update_timestamp();
  \`
  
  
  exports.up = function(knex, Promise) {
      return knex.raw(\`
        CREATE OR REPLACE FUNCTION on_update_timestamp()
        RETURNS trigger AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
      $$ language 'plpgsql';
      \`)
      .then(()=>{
        return knex.raw('create extension if not exists "uuid-ossp"')
      })
      .then(()=>{
        let table = '{{tablePrefix}}_task'
        return knex.schema.createTable(table, (t) => {
          t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()')).primary()
          t.string('name')
          t.boolean('complete')
          t.boolean('suspended')
          t.boolean('error')
          t.boolean('aborted')
          t.text('abort_error')
          t.jsonb('caller_metadata')
          t.text('rpc_correlation_id')
          t.text('rpc_reply_to')
          t.integer('retry_attempts').unsigned().notNull()
          t.integer('retry_delay').unsigned().notNull()
          t.integer('retries_remaining').unsigned().notNull()
          t.integer('requeue_count').unsigned().notNull()
          t.integer('current_transition').unsigned().notNull()
          t.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
          t.timestamp('updated_at').defaultTo(knex.fn.now()).notNull()
          t.timestamp('ended_at')
          t.timestamp('deleted_at').nullable();
        })
        .then(()=>{
          return knex.raw(onUpdateTrigger(table))
        })
      })
      .then(()=>{
        let table = '{{tablePrefix}}_state'
        return knex.schema.createTable(table, (t) => {
          t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()')).primary()
          t.jsonb('state').notNull()
          t.uuid('task_uuid').notNull()
          t.foreign('task_uuid').references('{{tablePrefix}}_task.uuid').onDelete('CASCADE').onUpdate('CASCADE')
          t.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
          t.timestamp('updated_at').defaultTo(knex.fn.now()).notNull()
          t.timestamp('ended_at')
          t.timestamp('deleted_at').nullable();
        })
        .then(() => {
          return knex.raw(onUpdateTrigger(table))
        })
      })
      .then(()=>{
        let table = '{{tablePrefix}}_transition'
        return knex.schema.createTable(table, (t) => {
          t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()')).primary()
          t.string('name')
          t.integer('ordinal').unsigned()
          t.boolean('complete')
          t.boolean('error')
          t.text('error_stack')
          t.string('destination')
          t.boolean('requeue')
          t.integer('wait').unsigned()
          t.uuid('starting_state').notNull()
          t.foreign('starting_state').references('{{tablePrefix}}_state.uuid').onDelete('CASCADE').onUpdate('CASCADE')
          t.uuid('ending_state')
          t.foreign('ending_state').references('{{tablePrefix}}_state.uuid').onDelete('CASCADE').onUpdate('CASCADE')
          t.uuid('task_uuid').notNull()
          t.foreign('task_uuid').references('{{tablePrefix}}_task.uuid').onDelete('CASCADE').onUpdate('CASCADE')
          t.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
          t.timestamp('updated_at').defaultTo(knex.fn.now()).notNull()
          t.timestamp('ended_at')
          t.timestamp('deleted_at').nullable();
        })
        .then(() => {
          return knex.raw(onUpdateTrigger(table))
        })

      })
      .then(() => {
        let table = '{{tablePrefix}}_log'
        return knex.schema.createTable(table, (t) => {
          t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()')).primary()
          t.enum('level', ['log', 'warn', 'info', 'error'])
          t.text('message')
          t.uuid('task_uuid').notNull()
          t.foreign('task_uuid').references('{{tablePrefix}}_task.uuid').onDelete('CASCADE').onUpdate('CASCADE')
          t.uuid('transition_uuid').notNull()
          t.foreign('transition_uuid').references('{{tablePrefix}}_transition.uuid').onDelete('CASCADE').onUpdate('CASCADE')
          t.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
          t.timestamp('updated_at').defaultTo(knex.fn.now()).notNull()
          t.timestamp('deleted_at').nullable();
        })
      })
  }
  
  exports.down = function(knex, Promise){
     return knex.schema.dropTableIfExists('{{tablePrefix}}_log')
     .then(() => {
       return knex.schema.dropTableIfExists('{{tablePrefix}}_transition')
     })
     .then(() => {
       return knex.schema.dropTableIfExists('{{tablePrefix}}_state')
     })
     .then(() => {
       return knex.schema.dropTableIfExists('{{tablePrefix}}_task')
     })
     .then(() => {
       return knex.raw('drop extension if exists "uuid-ossp"')
     })
     .then(() => {
       return knex.raw('DROP FUNCTION IF EXISTS on_update_timestamp()')
     })
  }
  `
}